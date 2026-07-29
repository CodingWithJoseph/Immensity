# Monitoring engine — roadmap

The Monitor section today collects separate signals (traffic, usage, sessions,
experience, errors, logs, problems, revenue) per launched product. This roadmap
takes it from "we collect signals" to "we reconstruct what happened across the
whole stack" — the difference between a dashboard and an observability product.

Three principles drive everything below, drawn from best-in-class tools:

1. **Verdict before data** — every screen states what's happening in a sentence
   before it shows a chart.
2. **Context against normal** — every number is shown against its baseline, so a
   spike is *visible*, not something you have to read for.
3. **Woven surfaces** — an error links to the sessions it hit, the release that
   caused it, and the investigation it belongs to. Cohesion is the premium feel.

---

## 1. Improvement backlog

### A. What we capture (data model)
- [ ] **Error-type taxonomy.** Today errors carry only a level (error/warning).
      Add a `type`: exception, failed network request, crash, app-not-responding,
      content-security-policy violation, reported (manual) error. Unlocks the
      "choose what you want to see" filtering.
- [ ] **Platform dimension** on every signal: web / mobile / custom. Foundation
      for the mobile phase and the web↔mobile scope switch.
- [ ] **Instrumentation source flag**: `auto` vs `manual` on every event/span.
- [ ] **First-party vs third-party** attribution (the "URL provider" split) —
      separate our failures from a flaky payment provider's.
- [ ] **Richer context everywhere**: operating system, browser/device, country,
      release, route. We have `release` + `session_id` on events/errors/logs
      already; extend the rest across all signal types.
- [ ] **Resource & long-task capture** (web analog of "app not responding").
- [ ] **Crash & app-not-responding capture** (mobile phase).

### B. Dimensions & filtering
- [ ] Faceted filter bar with persistent chips (type, platform, release, country,
      frontend, source).
- [ ] Left **quick-filter rail with live counts** (Healthy / Warning / Unhealthy).
- [ ] **Saved views / segments.**
- [ ] Scope switcher (All / Web / Mobile / Custom) on every page.

### C. Visualization
- [ ] **Multi-metric Explorer table**: one row per frontend/feature with load
      rate, error rate, crash rate, felt-speed, health badge — sortable, with
      hide-columns and per-row sparklines.
- [ ] **Over-time hero charts** with a **normal-range baseline band** and
      **deploy markers** (keystone visual).
- [ ] **Breakdown donuts** by type / operating system / provider / country, with
      absolute counts and legends.
- [ ] **Geographic map** for errors and traffic.
- [ ] **Named-timing waterfall** for page experience (first byte → became
      interactive → fully loaded), in plain language.
- [ ] **Combined / Split-by-version** toggles on big charts.

### D. Navigation & cohesion
- [ ] **Cross-surface "Open with…" links** between every surface.
- [ ] Click any chart slice → it becomes a filter (drill without leaving).
- [ ] Breadcrumbs + deep-linkable filtered URLs.

### E. Intelligence
- [ ] Baseline anomaly detection feeding **Problems**.
- [ ] **Auto-written verdicts** (Command Center headline, generated from data).
- [ ] **Behavior→revenue drivers board** (Insights: green expansion drivers vs
      red churn drivers, each a plain sentence with a strength bar).
- [ ] **Feature-flow / journey graph** (see §3).
- [ ] **Distributed traces** (see §2).

### F. Mobile phase
- [ ] Crash-free users/sessions rate, app-start duration (cold/warm/hot),
      app-not-responding, version adoption, per-version crash breakdown — all
      sharing the trace identity so a mobile tap still links to a backend failure.

### G. Trust & instrumentation health
- [ ] **Instrumentation coverage** view: which features/routes are auto-covered,
      which are manually tagged, which are dark.
- [ ] Sampling transparency, retention windows, per-source freshness indicator.

### H. Premium polish (UI feel)
- [ ] One **page anatomy** every Monitor screen obeys: plain-language purpose
      line → one-sentence verdict → hero chart → breakdowns → table.
- [ ] **Plain-language metrics** in the UI, acronyms relegated to tooltips
      ("Looked ready in 3.2s", "Reacts to a tap in 184ms — snappy").
- [ ] Descriptive page subtitles (the per-page "separation" copy).
- [ ] Tinted status surfaces, number count-ups, layout-shaped skeletons,
      auto-refreshing relative time, monospace IDs, an 8px spacing rhythm, and a
      single accent color reserved for "needs your attention."

### Signature "wow" features
- [ ] **Command Center writes the headline** — a tinted verdict surface stating
      the situation in a sentence with evidence sparklines.
- [ ] **Deploy markers on every timeline** — cause-and-effect becomes visual.
- [ ] **Session replay filmstrip** — one visit as a vertical story, the error
      pinned in red where it hit.
- [ ] **Errors "blast radius"** — impact framed in people and money, not counts.
- [ ] **Insights drivers board** — behavior→revenue levers in plain sentences.

---

## 2. Auto-instrumentation: the connected trace

The single idea that makes the rest feel like one product: **every user action
gets a trace, propagated from the browser into the backend.** Then "feature A led
into feature B" and "this frontend error became a backend 500" are just queries.

### 2.1 Adopt a standard
Use **W3C Trace Context** (`traceparent` = `trace_id` + `span_id` per hop) and
**OpenTelemetry** span semantics. Don't invent an ID scheme — the standard is what
lets the Android agent (mobile phase) and backend frameworks plug in cheaply.

### 2.2 Frontend auto-instrumentation (`public/pf-usage.js`)
The beacon today does batching, sessions, sampling, do-not-track, identify, and
auto error capture (`window.error`). It is mostly *manual* (`record()`) otherwise.
Add automatic span emission by wrapping the browser's seams — no customer code
changes:
- **Wrap `fetch` / `XMLHttpRequest`**: a span per request, and inject a
  `traceparent` header on requests to allowlisted origins (the customer's API).
  This is the propagation handshake.
- **Route changes** (`pushState`/`popstate`): a span per view (already in the
  beacon's TODO).
- **Web vitals + resource timing + long tasks**: auto spans for "page became
  ready," "main thread froze."
- **Tagged interactions**: auto-capture clicks on `data-pf-feature="checkout"`.

All keep the existing `session_id` and `release`, plus new
`trace_id` / `span_id` / `parent_span_id`.

> ⚠️ This wraps the customer's own `fetch`. It must be defensive (never break the
> host site's requests on error, respect the origin allowlist, honor do-not-track
> and sampling). Ship behind a flag and roll out carefully.

### 2.3 Manual instrumentation (keep it, blend it)
Auto gets ~80%; manual names what matters — exactly like hand-tagging Android
features. A small SDK that rides the same trace:
```js
pf.feature('checkout').span('submit', () => { … })   // a named unit of work
pf.track('coupon_applied', { code })                  // business event on the trace
pf.setContext({ plan: 'pro' })                        // attributes flow to child spans
```
Each manual span is a child of the active auto span, so a hand-tagged feature
inherits the network call and backend work beneath it. The `auto`/`manual` flag
lets the UI distinguish them.

### 2.4 Backend
- Middleware reads incoming `traceparent`, **continues** the trace (does not start
  a new one), and emits its own spans: request, downstream calls, slow queries.
- On exception, attach the error to `trace_id` + `span_id` rather than recording
  it standalone.
- New `spans` table:
  `trace_id, span_id, parent_span_id, name, kind(client/server), service(web/backend/mobile),
   feature, start, duration, status, attributes(jsonb), release, platform, source(auto/manual)`.
  Existing `PortfolioUsageEvent` / `PortfolioErrorEvent` / logs gain a `trace_id`
  column so they hang off the same spine. (Additive, nullable — backfill-free.)

---

## 3. The payoffs that ride on traces

### 3.1 "How one feature leads into the next" — flow graph
With spans ordered within a trace/session, derive **edges** (A → B whenever B
follows A). Aggregate across users:
- A **journey Sankey** ("80% pricing → signup → dashboard; 12% bounce at signup").
- A **feature dependency map** (which frontend features call which backend services).
- Overlay error rate and drop-off on edges — see *where in the flow* people fall
  out or break.

### 3.2 "Did the frontend issue stop, or progress into the backend?" — incident chain
For a frontend error, inspect the other spans in its trace:
- **Frontend-only:** the failing span made no backend call, or the backend span
  succeeded — the bug is client-side.
- **Progressed into the backend:** the trace contains a backend span that failed
  first (earlier start, error status, ancestor of the frontend error) — backend
  caused it.
- **Backend degraded, frontend absorbed it:** backend slow/errored but no
  user-facing error — a latent risk worth flagging.

Render as a **vertical incident chain**:
`Checkout (web) → POST /charge (backend, 500, 1.8s) → user saw "Payment failed"`,
with the originating hop highlighted and a confidence note on causality
(parent/child + timing). This is the flagship "wow" — *where did it actually
break, across the stack.*

---

## 4. Phased delivery (each phase = its own reviewed PR)

1. **Trace spine.** `trace_id` on events/errors/logs + the `spans` table
   (migration); beacon `fetch`/`XHR` wrapper emitting spans + injecting
   `traceparent`; backend middleware continuing the trace. *Unlocks the incident
   chain, web-only.* ⚠️ touches the customer beacon + a prod migration.
2. **Dimensions.** Error-type taxonomy + platform/source columns + faceted
   filtering. *Unlocks "choose what to see" and the web/mobile/custom scope.*
3. **Surface look.** Explorer multi-metric table + breakdown donuts + baseline /
   deploy-marker hero charts + plain-language metrics.
4. **Graphs.** Flow graph + incident-chain UI.
5. **Mobile agent** speaking the same trace context; crashes / app-not-responding
   fold into the existing chain.

The keystone is Phase 1: modest code (a beacon wrapper, one backend middleware, a
table and a column) that turns separate signals into one connected story.
