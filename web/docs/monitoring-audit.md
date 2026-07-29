# Monitoring Audit (PR 0.1)

Phase 0 audit of Immensity Monitoring against the **v2 plan** (objects + engines).
No behavior changed; this is a read-only snapshot. Companion docs:
[`monitoring-data-contract.md`](./monitoring-data-contract.md) (the envelope) and
[`monitoring-routes.md`](./monitoring-routes.md) (the route map).

**Repos**
- `ProblemFinderWeb` — beacon `public/pf-usage.js`; public ingest proxies
  `app/api/public/portfolio/*`; monitor UI `app/(core)/dashboard/(monitor)/*`;
  authed portfolio proxies `app/api/portfolio/*`.
- `ProblemFinderBackend` — ingest + portfolio API `app/routes/portfolio.py`;
  alert engine `app/services/alerts.py`; schema `migrations/*.sql` (through `0032`).

Every status is backed by a `file:line` citation. The v2 plan asks the audit to
**verify the assumptions the engines depend on** — §1 answers those four
questions directly; that is the load-bearing part of this pass.

---

## 1. Engine-critical verifications (the four the plan demands)

### Q1 — Exact fields on usage & error events

| Field | Usage events | Error events |
|---|---|---|
| `visitor_id` | ✅ `0017:25` | ✅ `0022:44` |
| `session_id` | ✅ `0017:26` | ✅ `0022:45` |
| `user_ref` | ✅ `0017:27` | ✅ `0022:46` |
| `url` | ✅ `0017:28` | ✅ `0022:42` |
| `occurred_at` / `received_at` | ✅ both `0017:31-32` | ✅ both `0022:49-50` |
| `release` | ❌ **absent** | ✅ `0022:41` |
| `environment` | ❌ **absent** | ❌ **absent** |

**Engine impact:** "split-by-release" (PR 2.3) works for **errors today** but
**not usage/vitals** until `release` is added to usage events. `environment`
is absent end-to-end — no engine can split prod vs staging yet. Both must be
added to the envelope (B.1/B.2) **and** persisted (B.4 + migration).

### Q2 — Do fingerprint groups store affected-user / affected-session counts + first/last seen?

`portfolio_error_groups` stores `event_count`, `last_release`, `first_seen_at`,
`last_seen_at`, `status`, `level`, `title` (`0022:8-24`; serialized
`portfolio.py:174-189`).

- **first/last seen:** ✅ stored on the group, maintained on ingest (`portfolio.py:2626-2637`).
- **occurrences:** ✅ `event_count`, incremented on ingest (`:2633`).
- **affected sessions:** ⚠️ **not stored** — *computed at query time* per group via
  `GROUP BY group_id` over error events, 14-day window only (`portfolio.py:2451-2460`).
- **affected users:** ❌ **not computed anywhere** (no distinct `visitor_id`/`user_ref`
  per group).

**Engine impact:** Issue-promotion (PR 2.1) needs affected-**users** ranking — that
metric does not exist yet and must be added. Affected-sessions exists but only as
an ephemeral 14d query, not a property of the issue object.

### Q3 — Do aggregation / group-by endpoints exist, or only raw lists?

Partial. `GET /portfolio/{id}/usage` already does **some** `GROUP BY`: counts by
`event_type`, daily by date, funnel, growth, retention (`portfolio.py:2014-2165`).
But it does **not** roll up by `url` (top pages) or by event **name** (top custom
events) — the two rollups the v2 Usage screen is supposed to lead with. It returns
a raw `recentEvents` list capped at 20 (`:2066-2071`).

**Engine impact:** The **aggregation engine v0** (PR 1.1) is genuinely net-new for
the dimensions that matter (URL, event name). The plumbing pattern exists; the
specific rollups don't. No generic faceted/slice-by-dimension layer exists.

### Q4 — Where does the beacon live and what does it capture?

`ProblemFinderWeb/public/pf-usage.js` (167-line IIFE). Captures: pageview on load
(`:160-165`), custom events via `record()` (`:147`), `window.onerror` +
`unhandledrejection` with dedupe/cap (`:128-145`, `:100-126`), `identify()` (`:63`),
`group()` (`:90`). Does **not** capture: SPA route changes, web vitals, client logs,
fetch/XHR/resource errors. No batching/unload-flush (per-event `keepalive` fetch
`:48`).

---

## 2. What already exists (do **not** rebuild)

| Capability | Evidence |
|---|---|
| Public ingest: events / errors / identify | `portfolio.py:2494 / 2591 / 2534` |
| **Per-source write-key auth + origin allow-list** (not "spammable") | `:2500-2510`, `_origin_allowed:301`, `_usage_event_domain_allowed:312` |
| **`received_at` server-side** + Pydantic envelope validation | `:2525`, `:2662`; bodies `:57`, `:70`, `:86` |
| Visitor/user identity + Stripe-customer join (explicit/email) | `pf-usage.js:23-90`; `ingest_identify:2534`; `migrations/0032` |
| Fingerprint error grouping + auto-reopen on regression | `_error_fingerprint:342`; reopen `:2641` |
| Usage analytics (counts, funnel, growth, retention, daily) | `:1994-2190` |
| Usage↔errors correlation | `GET /{id}/correlation:2244` |
| Revenue intelligence (MRR, movements, Rule-of-40) | `:1010-1406` |
| Alert engine (email + dedupe via `portfolio_alerts`) | `alerts.py:317`; `migrations/0023` |
| Monitor UI shell (usage, traffic, errors, portfolio, revenue, setup) | `app/(core)/dashboard/(monitor)/*` |

---

## 3. Gap register, mapped to v2 PRs

### Beacon (Phase B)
- `release` + `environment` not on usage events; envelope uses legacy names
  (`product_id`/`key`/`user_id`) → **B.1/B.2** + contract.
- Rolling 30-min `session_id` missing (static `sessionStorage` `pf-usage.js:24`) → **B.2**.
- SPA navigation capture missing → **B.1**.
- Delivery layer (batch/retry/`sendBeacon` unload) missing → **B.3**.
- `sampleRate` / `beforeSend` / DNT / `environment` config missing → **B.1**.
- Vitals + logs capture missing → **1.4 / 2.6**.

### Ingest (Layer 1)
- Rate limiting per source missing (the real **B.4** substance) → **B.4**.
- `/vitals` + `/logs` endpoints missing → **1.4 / 2.6**.
- Persist `release`/`environment` on usage events (migration) → **B.4**.

### Engines (Layer 2.5 — the v2 heart)
- **Aggregation engine v0**: top-pages-by-URL, top-events-by-name — missing → **1.1**.
- **Health verdict engine**: no per-source state object anywhere → **1.5 / 3.1**.
- **Issue promotion**: groups aren't first-class issue objects; affected-**users**
  not computed; affected-sessions only ephemeral 14d → **2.1**.
- **Faceted query layer**: no generic slice-by-dimension → **2.2 / 2.6**.
- **Split-by-release**: works for errors, blocked for usage/vitals (no `release`) → **2.3**.

### Screens (Layer 3)
- Sessions list/detail, Experience Vitals, Issue detail, Logs explorer, Command
  Center, Problems + impact, Investigations/reports — all missing.
- Errors GET returns a **list with no detail route** and **no PATCH** (resolve/reopen
  is auto-only on ingest) → **2.2 / 2.4**.

### Storage (Layer 2)
- `portfolio_web_vitals`, `portfolio_logs`, `monitoring_problems`,
  `monitoring_investigations`(+evidence/notes), `monitoring_reports` — none exist.
- `monitoring_problems` must stay **separate** from the opportunity-discovery
  `problems` table (`app/routes/problems.py`).

### Connect / Alerts
- Alert engine emails but writes **no problem record** (gap for **3.4**).
- Alert types present: `new_issue`, `error_spike`, `signups_drop`, `revenue_drop`
  (`alerts.py:6-9`). Plan adds `source_stale`, `source_noisy` and renames
  `new_issue`→`new_error_group`, `signups_drop`→`signup_drop`.

---

## 4. Sequencing implications

1. **Audit confirms the two gates:** `release`/`environment` on the envelope, and
   the rolling `session_id`. Until both flow on *every* event (B.2), split-by-release
   and session/affected-session joins are blocked or half-blind.
2. **Cheapest power is real net-new** — the URL/event-name rollups (1.1) and the
   per-source verdict object (1.5) don't exist; they're small but not "already there."
3. **Issue promotion is the one with a hidden cost** — affected-**users** must be
   computed from scratch, and the issue object needs materialized properties rather
   than per-request 14d queries.
4. **Don't rebuild auth/identity/`received_at`/grouping** — they ship and work.

**One line:** the data layer (ingest, auth, identity-join, usage analytics, error
grouping, revenue, alerts) is live; v2's work is the **envelope completion**
(`release`/`environment`/session), the **engines** (rollup, health, issue, facets,
split-by-release), and the **object screens** on top.
