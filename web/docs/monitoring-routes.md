# Monitoring Route Map (PR 0.1)

Every monitoring-related route across both repos, with what exists today and where
v2 PRs add new ones. Companion: [`monitoring-audit.md`](./monitoring-audit.md),
[`monitoring-data-contract.md`](./monitoring-data-contract.md).

**Topology.** Browser → Next.js route handler (`app/api/...`) → FastAPI
(`${NEXT_PUBLIC_API_URL}/...`). Public ingest proxies are CORS-enabled and forward
the raw body; authed proxies attach the Firebase bearer (`lib/apiProxy.ts`). FastAPI
has **no global prefix** — each router carries its own (`main.py:89`, router
includes `:105-118`).

Legend: ✅ exists · 🆕 new (v2) · 🔧 enhance.

---

## 1. Public ingest (unauthenticated, write-key gated)

Backend router prefix `/public/portfolio` (`portfolio.py:48`). Auth = body `key`
matches a connected `portfolio_usage_sources.public_key` + origin/domain allow-list.

| Method + path | Status | Backend handler | Web proxy |
|---|---|---|---|
| `POST /public/portfolio/events` | ✅ | `portfolio.py:2494` | `app/api/public/portfolio/events/route.ts` |
| `POST /public/portfolio/errors` | ✅ | `portfolio.py:2591` | `app/api/public/portfolio/errors/route.ts` |
| `POST /public/portfolio/identify` | ✅ | `portfolio.py:2534` | `app/api/public/portfolio/identify/route.ts` |
| `POST /public/portfolio/vitals` | 🆕 1.4 | — | — |
| `POST /public/portfolio/logs` | ✅ 2.6 | `portfolio.py` | `app/api/public/portfolio/logs/route.ts` |

Cross-cutting 🔧 **B.4**: add per-source rate limiting to all ingest handlers.

> Note: the marketing/public read API (`/public/clusters`, `/public/stats`) lives
> in `app/routes/public.py` and is unrelated to monitoring ingest.

---

## 2. Authed portfolio API (read/manage)

Backend router prefix `/portfolio` (`portfolio.py:47`), `get_uid` dependency. Web
proxies under `app/api/portfolio/[pipelineId]/...`.

### Exists ✅
| Method + path | Handler | Web proxy |
|---|---|---|
| `GET /portfolio` | `:493` | `app/api/portfolio/route.ts` |
| `GET /portfolio/{id}` | `:511` | `app/api/portfolio/[pipelineId]/route.ts` |
| `POST /portfolio/products` | `:542` | `app/api/portfolio/products/route.ts` |
| `GET/PUT /portfolio/admin/settings` | `:594/:602` | `app/api/portfolio/admin/settings/route.ts` |
| `POST/PATCH /portfolio/{id}/usage-source` | `:616/:645` | `app/api/portfolio/[pipelineId]/usage-source/route.ts` |
| `GET /portfolio/{id}/usage` | `:1994` | `app/api/portfolio/[pipelineId]/usage/route.ts` |
| `GET /portfolio/{id}/errors` | `:2382` | `app/api/portfolio/[pipelineId]/errors/route.ts` |
| `GET /portfolio/{id}/correlation` | `:2244` | `app/api/portfolio/[pipelineId]/correlation/route.ts` |
| `GET/PUT /portfolio/{id}/alert-settings` | `:2351/:2362` | `app/api/portfolio/[pipelineId]/alert-settings/route.ts` |
| Revenue: `…/revenue`, `…/revenue/sync`, `…/revenue-source[/connect]`, `…/revenue/economics`, `…/revenue/join-coverage`, `…/insights/revenue-correlation`, `…/revenue-source/stripe/callback` | `:665–:1012` | `app/api/portfolio/[pipelineId]/revenue*`, `.../insights/revenue-correlation` |

### New / enhance (v2)
| Method + path | Status | PR | Leads with |
|---|---|---|---|
| `GET /portfolio/{id}/usage` rollups (top pages, top events) | 🔧 | 1.1 | aggregation engine v0 |
| `GET /portfolio/{id}/sessions` | 🆕 | 1.2 | session objects |
| `GET /portfolio/{id}/sessions/{session_id}` | 🆕 | 1.3 | session timeline |
| `GET /portfolio/{id}/experience` (vitals) | 🆕 | 1.4 | per-URL vitals + rating |
| `GET /portfolio/{id}/health` (v2 verdict) | ✅ | 3.1 | live/stale/silent/noisy/failing + signals |
| `GET /portfolio/{id}/issues` | ✅ | 2.1 | issue objects ranked by affected users + trend |
| `GET /portfolio/{id}/issues/{group_id}` | ✅ | 2.2 | occurrences + faceted release/URL breakdown + sample |
| `GET /portfolio/{id}/errors/by-release` (split-by-release) | ✅ | 2.3 | per-release error rate — "did this deploy regress?" |
| `PATCH /portfolio/{id}/issues/{group_id}` (resolve/reopen) | ✅ | 2.4 | status |
| `GET /portfolio/{id}/issues/{group_id}/sessions` | ✅ | 2.5 | affected sessions → session timeline |
| `GET /portfolio/{id}/logs` (faceted) | ✅ | 2.6 | level / message search / session / release |
| `GET /portfolio/{id}/command-center` | ✅ | 3.2 | health verdict + trends + top issues |
| `GET /portfolio/{id}/insights/error-correlation` (alias of `/correlation`) | 🔧 | 3.3 | keep `/correlation` working |
| `GET /portfolio/{id}/problems` + `…/problems/{id}` (impact) | ✅ | 3.4 / 3.5 | problem objects, before/during/after |
| Investigations (CRUD + entries) `…/investigations[/{id}[/entries]]` · Reports `…/reports` + `…/reports/{id}/export` | ✅ | 4.1–4.5 | timeline, evidence, exportable report |

> Naming: new error routes use `issues` (the object) while the existing aggregate
> stays at `/errors`. Confirm in PR 2.1 whether `/errors` becomes an alias.

---

## 3. Monitor UI pages (`app/(core)/dashboard/(monitor)/monitor/`)

| Page | Status | Renders |
|---|---|---|
| `usage/page.tsx` | 🔧 1.1 | usage metrics → must lead with rollups |
| `traffic/page.tsx` | 🔧 1.1 | traffic |
| `errors/page.tsx` | 🔧 2.1 | → Issues list (objects, affected-users rank) |
| `portfolio/page.tsx` | 🔧 1.5 | source overview → health verdict badges |
| `revenue/page.tsx`, `revenue/insights/page.tsx` | ✅ | revenue intelligence |
| `setup/page.tsx` | ✅🔧 | snippet/setup (`components/UsageMonitor.tsx`) |
| `sessions/` (+ `[sessionId]`) | 🆕 1.2/1.3 | session list + timeline |
| `experience/` | 🆕 1.4 | vitals |
| `issues/[groupId]/` | 🆕 2.2 | issue detail |
| `logs/` | 🆕 2.6 | faceted logs |
| `command-center/` | 🆕 3.2 | verdicts + problems |
| `problems/` | ✅ 3.4 | flagged problems + impact |
| `investigate/` | ✅ 4.x | investigations, timeline, reports |

---

## 4. Alert engine (no HTTP route — scheduled)

`app/services/alerts.py`: `run_alert_checks()` (`:317`) and `run_alert_digests()`
(`:405`), invoked out-of-band (not via the API routers). Dedupe via
`portfolio_alerts`. **v2 3.4** adds writing a `monitoring_problems` record before
the email send inside `run_alert_checks`.

---

## 5. Contract preservation

All paths in §1–§2 marked ✅ are **stable contracts** — current shapes are
documented in [`monitoring-data-contract.md`](./monitoring-data-contract.md) §5.
New work adds routes; the only planned rename is the non-breaking
`/correlation` → `/insights/error-correlation` **alias** (3.3, keep the original).
