# Monitoring Data Contract (PR 0.1 / 0.2)

The single source of truth for the beacon envelope that the SDK emits and the
ingest endpoints accept. The beacon rebuild (Phase B) and any ingest change must
conform to this doc. Companion: [`monitoring-audit.md`](./monitoring-audit.md),
[`monitoring-routes.md`](./monitoring-routes.md).

Status of each field below: ✅ flows today · ➕ target (must be added) · 🔤 rename.

---

## 1. Naming reconciliation (wire vs storage) — **settle before B.1**

There are currently **two vocabularies**. The wire (beacon → ingest body) uses
legacy names; storage and the read API use the plan's canonical names. The server
maps between them on ingest (`portfolio.py:2515-2520`).

| Canonical (plan / storage) | Wire today (beacon body) | Read API (camelCase) |
|---|---|---|
| `pipeline_id` | `product_id` 🔤 | `pipelineId` |
| (source resolved server-side) | `key` (write key) | — |
| `source_id` | — (derived from key) | `sourceId` |
| `visitor_id` | `visitor_id` ✅ | `visitorId` |
| `session_id` | `session_id` ✅ | `sessionId` |
| `user_ref` | `user_id` 🔤 | `userId` |
| `url` | `url` ✅ | `url` |
| `referrer` | `referrer` ✅ | `referrer` |
| `event_type` | `event_type` ✅ | `eventType` |
| `release` | `release` (errors only) ➕ usage | `release` |
| `environment` | — ➕ | — ➕ |
| `metadata` | `metadata` ✅ | `metadata` |
| `occurred_at` | `occurred_at` ✅ | `occurredAt` |
| `received_at` | (server-set) | `receivedAt` |

**Decision required (PR 0.2):** either (a) rename the wire to canonical
(`product_id`→`pipeline_id`, `user_id`→`user_ref`) with a server-side
back-compat shim for the deployed snippet, or (b) keep the wire legacy and treat
the mapping as the contract boundary. Recommendation: **(a) with a shim** — the
beacon is being rebuilt anyway in B.1, and a clean wire avoids a permanent
translation layer. Until decided, B.1 must not change field names.

---

## 2. Canonical event envelope (target)

Every event of every type carries this envelope. Bold = **not flowing today**.

```jsonc
{
  "pipeline_id":  "uuid",       // product being monitored
  "key":          "pk_...",     // per-source write key (auth)
  "event_type":   "pageview",   // see §3
  "visitor_id":   "uuid",       // persistent, localStorage
  "session_id":   "uuid",       // rolling, 30-min inactivity rollover  (B.2)
  "user_ref":     "string|null",// set by identify()
  "url":          "https://...",
  "referrer":     "https://...|null",
  "release":      "string|null",   // ➕ add to usage (errors already have it)
  "environment":  "production",    // ➕ add everywhere
  "metadata":     { },
  "occurred_at":  "ISO-8601"       // client clock; received_at set server-side
}
```

**Server always sets** `received_at` (`portfolio.py:2525`, `:2662`) and resolves
`source_id` + `pipeline_id` from the write key. Client `occurred_at` is trusted.

---

## 3. Event types

`UsageEventType` is a closed enum, enforced both in Pydantic (`portfolio.py:52`)
and a DB `CHECK` (`migrations/0017:33`): `pageview · signup · login · activation ·
custom`. Adding a type requires touching **both**. Custom product events ride on
`event_type:"custom"` with a name in `metadata` (the aggregation engine will need a
stable `metadata.name` convention — define it in PR 1.1).

Error level enum: `error · warning` (`0022:23`, `:50`). Identity resolution
method: `explicit · email · unresolved` (`0032`).

---

## 4. Per-endpoint request bodies (current, authoritative)

### `POST /public/portfolio/events` → `UsageEventBody`
`product_id, key, event_type, visitor_id?, session_id?, user_id?, url?, referrer?,
release?, environment?, metadata?, occurred_at?` — full envelope (B.4).

### `POST /public/portfolio/errors` → `ErrorEventBody`
`product_id, key, message, stack?, level=error, handled?, url?, release?,
environment?, visitor_id?, session_id?, user_id?, metadata?, occurred_at?`.

### `POST /public/portfolio/batch` → `BatchBody` (B.3)
`product_id, key, batch[]` (≤100). Each item: `kind (event|error)` + the matching
fields above. Stored via the same helpers as the single endpoints; per-source
rate limit costs the batch's item count.

### `POST /public/portfolio/identify` → `IdentifyBody`
`product_id, key, user_id, stripe_customer_id?, email?, group_id?, traits?,
session_id?, visitor_id?` — last two added in B.2 for session backfill.

### `POST /public/portfolio/vitals` → `VitalBody` (B/1.4) ✅
`product_id, key, metric (LCP|CLS|INP|FCP|TTFB), value, rating
(good|needs-improvement|poor)?, url?, navigation_id?, + envelope`. Stored in
`portfolio_web_vitals`; rating falls back to threshold-derived when absent. The
beacon delivers vitals through `/batch` (`kind: vital`); this endpoint is the
direct path.

### `POST /public/portfolio/logs` → `LogBody` (2.6) ✅
`product_id, key, level (debug|info|warn|error), message, metadata?, + envelope`.
Stored in `portfolio_logs`. Beacon delivers via `/batch` (`kind: log`,
`log_level`); this endpoint is the direct path. `log()` + opt-in console hook.

**Auth (all ingest):** body `key` must match a `portfolio_usage_sources.public_key`
with `status='connected'`, and the request origin/`url` host must match the
source's `allowed_domain` (`portfolio.py:2500-2510`, `_origin_allowed:301`).
✅ Per-source rate limiting (B.4): `_check_rate_limit` caps events/source/minute
(`ingest_rate_limit_per_minute`, default 600; a batch costs its event total) and
returns 429 with `Retry-After`; the beacon backs off.

---

## 5. Stored columns (authoritative — from migrations)

### `portfolio_usage_events` (`migrations/0017`, `0033`)
`id, pipeline_id, source_id, event_type, visitor_id, session_id, user_ref, url,
referrer, release, environment, metadata(jsonb), occurred_at, received_at`.
✅ `release` + `environment` added in `migrations/0033` (B.4), indexed by
`(pipeline_id, release)` / `(pipeline_id, environment)` for split-by.

### `portfolio_error_events` (`migrations/0022`, `0033`)
`id, pipeline_id, source_id, group_id, fingerprint, message, stack, level, handled,
url, release, environment, visitor_id, session_id, user_ref, metadata, occurred_at,
received_at`. ✅ `environment` added in `migrations/0033` (B.4).

### `portfolio_error_groups` (`migrations/0022`)
`id, pipeline_id, source_id, fingerprint, title, level, status, event_count,
last_release, first_seen_at, last_seen_at, created_at, updated_at`.
**Not stored (compute or add for issue-promotion PR 2.1):** affected-session count
(today computed per-request 14d only, `portfolio.py:2451-2460`), affected-**user**
count (not computed anywhere), trend.

### `portfolio_identities` / `portfolio_customers` (`migrations/0032`)
Identity join: `user_ref → stripe_customer_id` via `resolution_method`
(`explicit|email|unresolved`).

### Read-API serialization (camelCase)
Usage event `portfolio.py:157-171`; error group `:174-189`; error event `:192-210`;
usage source `:140-154`. These are the shapes the frontend consumes — keep stable.

---

## 6. Invariants the engines rely on

1. **Identity on every event.** `visitor_id` + `session_id` must be present on
   *every* event type (usage, error, vitals, logs) or cross-event joins
   (sessions, affected-sessions, correlation) silently drop rows. Today they are
   optional (`*_id: str | None`) — B.2 must guarantee them client-side.
2. **`release` + `environment` on every event** — required for split-by dimensions.
3. **Stable `metadata.name` for custom events** — the aggregation engine's
   "top events by frequency" key.
4. **`occurred_at` client / `received_at` server** — never collapse the two; clock
   skew and the unload-flush (B.3) make them legitimately different.
