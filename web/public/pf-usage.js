(function () {
  // ---------------------------------------------------------------------------
  // Immensity beacon (SDK core, PR B.1)
  //
  // One emit path. Every event — pageview, custom, error — is built into a single
  // canonical envelope and run through the same pipeline (sample -> beforeSend ->
  // transport). This is what guarantees a field can't be present on one event
  // type and missing on another (the inconsistency the Phase 0 audit found:
  // release/environment were on errors but not usage events).
  //
  // Naming: the envelope uses the canonical contract names internally
  // (pipeline_id, user_ref, environment...). They are mapped to the current
  // ingest wire (product_id, user_id...) only at the transport boundary, so the
  // backend is untouched (B.1 constraint). When the wire is renamed in B.4 the
  // mappers below are the only thing that changes.
  //
  // Scope held for later PRs: rolling 30-min session_id + identify() backfill
  // (B.2), batching + sendBeacon unload flush (B.3), vitals/logs (1.4/2.6).
  // ---------------------------------------------------------------------------
  var script = document.currentScript;
  var pipelineId = script && script.getAttribute('data-product-id');
  var writeKey = script && script.getAttribute('data-key');
  if (!pipelineId || !writeKey || !script || !script.src) return;

  // Config: script attributes are the base; an optional global set before the
  // tag (window.problemFinderUsageConfig) supplies things attributes can't hold,
  // namely the beforeSend function.
  var overrides = (window.problemFinderUsageConfig && typeof window.problemFinderUsageConfig === 'object')
    ? window.problemFinderUsageConfig
    : {};

  function attr(name) { return script.getAttribute(name); }
  function pick(value, fallback) { return (value === undefined || value === null || value === '') ? fallback : value; }

  function parseRate(value) {
    var n = parseFloat(value);
    if (isNaN(n)) return 1;
    if (n < 0) return 0;
    if (n > 1) return 1;
    return n;
  }

  var config = {
    pipelineId: pipelineId,
    writeKey: writeKey,
    environment: String(pick(overrides.environment, pick(attr('data-environment'), 'production'))),
    release: pick(overrides.release, pick(attr('data-release'), null)),
    // sampleRate applies to usage events only; errors are never sampled away.
    sampleRate: parseRate(pick(overrides.sampleRate, attr('data-sample-rate'))),
    // beforeSend(envelope) may mutate the envelope (e.g. scrub PII) or return a
    // falsy value to drop the event entirely. Only honored as a function.
    beforeSend: (typeof overrides.beforeSend === 'function') ? overrides.beforeSend : null,
    // Privacy: opt-in. When enabled and the browser signals Do Not Track, the
    // beacon collects nothing. Default off so existing installs are unchanged.
    respectDnt: pick(overrides.respectDnt, attr('data-respect-dnt')) === true
      || pick(overrides.respectDnt, attr('data-respect-dnt')) === 'true',
    // Opt-in console capture: mirror console.warn/error into logs. Off by
    // default so console noise/PII isn't shipped without intent.
    captureConsole: pick(overrides.captureConsole, attr('data-capture-console')) === true
      || pick(overrides.captureConsole, attr('data-capture-console')) === 'true',
    // Opt-in distributed tracing: wrap fetch/XHR to emit client spans and
    // propagate a W3C traceparent to same-origin requests. Off by default — it
    // touches the host page's network layer, so it ships behind a flag.
    trace: pick(overrides.trace, attr('data-trace')) === true
      || pick(overrides.trace, attr('data-trace')) === 'true'
  };

  var base = pick(overrides.endpoint, attr('data-endpoint'));
  var origin = base ? String(base) : script.src;
  var endpoints = {
    events: new URL('/api/public/portfolio/events', origin).toString(),
    errors: new URL('/api/public/portfolio/errors', origin).toString(),
    identify: new URL('/api/public/portfolio/identify', origin).toString(),
    batch: new URL('/api/public/portfolio/batch', origin).toString()
  };

  // --- Tracing context (opt-in) -----------------------------------------------
  // One trace spans a page load: a stable trace id + a root span the page's
  // fetch/XHR spans hang off. All inert unless config.trace is set.
  var traceEnabled = !!config.trace;
  function randomHex(bytes) {
    var out = '';
    var buf = null;
    try {
      if (crypto && crypto.getRandomValues) { buf = new Uint8Array(bytes); crypto.getRandomValues(buf); }
    } catch (_err) { buf = null; }
    for (var i = 0; i < bytes; i++) {
      var b = buf ? buf[i] : Math.floor(Math.random() * 256);
      out += (b < 16 ? '0' : '') + b.toString(16);
    }
    return out;
  }
  var traceId = traceEnabled ? randomHex(16) : null;    // 32 hex chars (W3C trace-id)
  var rootSpanId = traceEnabled ? randomHex(8) : null;  // 16 hex chars (W3C span-id)
  var activeSpanId = rootSpanId;
  var traceFinalized = false;
  function nowMs() { try { return (window.performance && performance.now) ? performance.now() : Date.now(); } catch (_e) { return Date.now(); } }
  var traceStart = nowMs();
  function urlString(input) {
    try { return (typeof input === 'string') ? input : (input && (input.url || input.href)) || ''; } catch (_e) { return ''; }
  }
  function sameOrigin(url) {
    try { return new URL(url, window.location.href).origin === window.location.origin; } catch (_e) { return false; }
  }
  function isIngestUrl(url) {
    try { return new URL(url, window.location.href).toString().indexOf('/api/public/portfolio/') !== -1; } catch (_e) { return false; }
  }
  function pathOf(url) {
    try { return new URL(url, window.location.href).pathname || '/'; } catch (_e) { return String(url).slice(0, 120); }
  }
  function traceparent(spanId) { return '00-' + traceId + '-' + spanId + '-01'; }

  function dntEnabled() {
    if (!config.respectDnt) return false;
    var dnt = window.navigator && (navigator.doNotTrack || navigator.msDoNotTrack || window.doNotTrack);
    return dnt === '1' || dnt === 'yes' || dnt === 1;
  }
  // If the visitor opts out, expose a no-op API and stop. Nothing is sent.
  if (dntEnabled()) {
    var noopFeature = { attr: chainNoop, step: stepNoop, ok: chainNoop, error: chainNoop, end: chainNoop };
    function chainNoop() { return noopFeature; }
    function stepNoop() { return { end: function () {} }; }
    window.problemFinderUsage = {
      record: function () {}, identify: function () {}, group: function () {}, log: function () {}, recordError: function () {},
      startFeature: function () { return noopFeature; },
      feature: function (name, fn) { return typeof fn === 'function' ? fn(noopFeature) : noopFeature; }
    };
    return;
  }

  // --- Identity (PR B.2) -------------------------------------------------------
  // visitor_id: persistent in localStorage, identifies the browser forever.
  // session_id: rolling, survives reloads but rolls over after 30 minutes of
  //   inactivity. Every emitted event refreshes the activity stamp, so an active
  //   visitor stays in one session and a returning visitor starts a fresh one.
  // user_ref: anonymous until identify() binds a known user, then attached to
  //   every subsequent event and backfilled onto the session's earlier rows.
  var SESSION_TIMEOUT_MS = 30 * 60 * 1000;

  function newId() {
    try {
      return (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random();
    } catch (_err) {
      return String(Date.now()) + Math.random();
    }
  }
  function idFromStorage(storage, name) {
    try {
      var value = storage.getItem(name);
      if (!value) { value = newId(); storage.setItem(name, value); }
      return value;
    } catch (_err) {
      return newId();
    }
  }
  function restore(name) {
    try { return window.localStorage.getItem(name) || null; } catch (_err) { return null; }
  }
  function persist(name, value) {
    try { window.localStorage.setItem(name, value); } catch (_err) {}
  }

  // Resolve the live session id, rolling it over on inactivity and touching the
  // activity stamp. Called for every event so activity keeps the session alive.
  function currentSessionId() {
    var now = Date.now();
    var id, ts;
    try {
      id = window.localStorage.getItem('pf_usage_session_id');
      ts = parseInt(window.localStorage.getItem('pf_usage_session_ts'), 10);
    } catch (_err) { id = null; ts = NaN; }
    if (!id || !ts || isNaN(ts) || (now - ts) > SESSION_TIMEOUT_MS) {
      id = newId();
    }
    try {
      window.localStorage.setItem('pf_usage_session_id', id);
      window.localStorage.setItem('pf_usage_session_ts', String(now));
    } catch (_err) {}
    return id;
  }

  var visitorId = idFromStorage(window.localStorage, 'pf_usage_visitor_id');
  var userRef = restore('pf_usage_user_id');
  var groupId = restore('pf_usage_group_id');

  // --- The single emit path ----------------------------------------------------
  // Build the full canonical envelope every event shares. eventType-specific
  // fields (message/stack for errors) ride in `extra`.
  function buildEnvelope(eventType, metadata, extra) {
    var meta = metadata || {};
    if (groupId) meta = Object.assign({ group_id: groupId }, meta);
    var envelope = {
      pipeline_id: config.pipelineId,
      event_type: eventType,
      visitor_id: visitorId,
      session_id: currentSessionId(),
      user_ref: userRef,
      url: window.location.href,
      referrer: document.referrer || null,
      environment: config.environment,
      release: config.release,
      platform: 'web',
      metadata: meta,
      occurred_at: new Date().toISOString()
    };
    // When tracing is on, every signal carries the active trace so an error or
    // event can be tied back to the request/span it happened in.
    if (traceEnabled) {
      envelope.trace_id = traceId;
      envelope.parent_span_id = activeSpanId;
    }
    if (extra) Object.assign(envelope, extra);
    return envelope;
  }

  // Run the beforeSend hook. Returns the (possibly mutated) envelope, or null to
  // drop. A throwing hook must not break delivery, so failures fall back to the
  // original envelope.
  function applyBeforeSend(envelope) {
    if (!config.beforeSend) return envelope;
    try {
      var result = config.beforeSend(envelope);
      if (result === false || result === null || result === undefined) return null;
      return (typeof result === 'object') ? result : envelope;
    } catch (_err) {
      return envelope;
    }
  }

  function sampledOut() {
    return config.sampleRate < 1 && Math.random() >= config.sampleRate;
  }

  function post(url, body) {
    try {
      fetch(url, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).catch(function () {});
    } catch (_err) {}
  }

  // --- Delivery layer (PR B.3) -------------------------------------------------
  // Events are queued and flushed as a batch rather than one request each: fewer
  // requests, and on page unload the whole queue ships in a single sendBeacon so
  // the last events of a visit aren't lost. Failed flushes retry with backoff.
  var BATCH_MAX = 20;          // events per flush request (also the max-payload guard)
  var FLUSH_DELAY_MS = 2000;   // debounce window for the timed flush
  var MAX_QUEUE = 200;         // hard cap so a broken endpoint can't grow memory
  var MAX_RETRIES = 4;         // backoff: 1s, 2s, 4s, 8s
  var queue = [];
  var flushTimer = null;

  // Map the canonical envelope to a batch item. The only place legacy wire names
  // live; release/environment ride along and are ignored by ingest until B.4.
  function toBatchItem(envelope) {
    if (envelope.event_type === 'span') {
      return {
        kind: 'span',
        trace_id: envelope.trace_id,
        span_id: envelope.span_id,
        parent_span_id: envelope.parent_span_id,
        name: envelope.name,
        span_kind: envelope.span_kind || 'client',
        service: envelope.service || 'web',
        feature: envelope.feature || null,
        status: envelope.status,
        duration_ms: envelope.duration_ms,
        url: envelope.url,
        release: envelope.release,
        environment: envelope.environment,
        platform: envelope.platform,
        capture_mode: envelope.capture_mode || 'auto',
        visitor_id: envelope.visitor_id,
        session_id: envelope.session_id,
        user_id: envelope.user_ref,
        metadata: envelope.metadata,
        occurred_at: envelope.occurred_at
      };
    }
    if (envelope.event_type === 'log') {
      return {
        kind: 'log',
        log_level: envelope.level,
        message: envelope.message,
        url: envelope.url,
        release: envelope.release,
        environment: envelope.environment,
        platform: envelope.platform,
        visitor_id: envelope.visitor_id,
        session_id: envelope.session_id,
        user_id: envelope.user_ref,
        metadata: envelope.metadata,
        occurred_at: envelope.occurred_at
      };
    }
    if (envelope.event_type === 'vital') {
      return {
        kind: 'vital',
        metric: envelope.metric,
        value: envelope.value,
        rating: envelope.rating,
        navigation_id: envelope.navigation_id,
        url: envelope.url,
        release: envelope.release,
        environment: envelope.environment,
        platform: envelope.platform,
        visitor_id: envelope.visitor_id,
        session_id: envelope.session_id,
        user_id: envelope.user_ref,
        occurred_at: envelope.occurred_at
      };
    }
    if (envelope.event_type === 'error') {
      return {
        kind: 'error',
        message: envelope.message,
        stack: envelope.stack,
        level: envelope.level || 'error',
        handled: envelope.handled === true,
        error_type: envelope.error_type,
        // Forward the trace so an error joins the span/feature it happened in.
        trace_id: envelope.trace_id,
        span_id: envelope.span_id,
        parent_span_id: envelope.parent_span_id,
        url: envelope.url,
        release: envelope.release,
        environment: envelope.environment,
        platform: envelope.platform,
        capture_mode: envelope.capture_mode,
        visitor_id: envelope.visitor_id,
        session_id: envelope.session_id,
        user_id: envelope.user_ref,
        metadata: envelope.metadata,
        occurred_at: envelope.occurred_at
      };
    }
    return {
      kind: 'event',
      event_type: envelope.event_type,
      url: envelope.url,
      referrer: envelope.referrer,
      release: envelope.release,
      environment: envelope.environment,
      platform: envelope.platform,
      capture_mode: envelope.capture_mode,
      visitor_id: envelope.visitor_id,
      session_id: envelope.session_id,
      user_id: envelope.user_ref,
      metadata: envelope.metadata,
      occurred_at: envelope.occurred_at
    };
  }

  function batchBody(envelopes) {
    var items = [];
    for (var i = 0; i < envelopes.length; i++) items.push(toBatchItem(envelopes[i]));
    return { product_id: config.pipelineId, key: config.writeKey, batch: items };
  }

  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(function () { flushTimer = null; flush(false); }, FLUSH_DELAY_MS);
  }

  function enqueue(envelope) {
    if (!envelope) return;
    if (queue.length >= MAX_QUEUE) queue.shift();   // drop oldest under sustained failure
    queue.push(envelope);
    if (queue.length >= BATCH_MAX) flush(false);
    else scheduleFlush();
  }

  // Flush queued events. useBeacon=true (page unload) ships everything via
  // sendBeacon in BATCH_MAX-sized chunks; otherwise send one chunk over fetch
  // and reschedule whatever remains.
  function flush(useBeacon) {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    if (!queue.length) return;

    if (useBeacon && navigator && typeof navigator.sendBeacon === 'function') {
      var all = queue.splice(0, queue.length);
      for (var i = 0; i < all.length; i += BATCH_MAX) {
        var chunk = all.slice(i, i + BATCH_MAX);
        try {
          // text/plain keeps it a CORS-simple request (no preflight on unload);
          // the proxy reads the body as text and forwards it as JSON.
          var blob = new Blob([JSON.stringify(batchBody(chunk))], { type: 'text/plain' });
          if (!navigator.sendBeacon(endpoints.batch, blob)) { queue = all.slice(i).concat(queue); break; }
        } catch (_err) {
          queue = all.slice(i).concat(queue);
          break;
        }
      }
      return;
    }

    var items = queue.splice(0, BATCH_MAX);
    sendBatch(batchBody(items), items, 0);
    if (queue.length) scheduleFlush();
  }

  // Retry transient failures (network error, 429, 5xx) with exponential backoff.
  // A 4xx (bad key, disallowed origin) is terminal — drop rather than loop.
  function sendBatch(body, items, attempt) {
    try {
      fetch(endpoints.batch, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(function (res) {
        if (res && (res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
          retryBatch(body, items, attempt);
        }
      }).catch(function () {
        if (attempt < MAX_RETRIES) retryBatch(body, items, attempt);
      });
    } catch (_err) {
      if (attempt < MAX_RETRIES) retryBatch(body, items, attempt);
    }
  }

  function retryBatch(body, items, attempt) {
    var delay = 1000 * Math.pow(2, attempt);   // 1s, 2s, 4s, 8s
    setTimeout(function () { sendBatch(body, items, attempt + 1); }, delay);
  }

  // Usage events (pageview, custom, signup, ...). The one entry point.
  // captureMode tags how the event was instrumented: 'auto' for the beacon's
  // own listeners (pageview), 'manual' for the developer's record() calls. The
  // public record() omits it, so it defaults to 'manual'.
  function emit(eventType, metadata, captureMode) {
    if (sampledOut()) return;
    enqueue(applyBeforeSend(buildEnvelope(eventType || 'custom', metadata, {
      capture_mode: captureMode || 'manual'
    })));
  }

  // --- Error capture -----------------------------------------------------------
  // Dedupe + per-page cap preserved so a tight error loop can't flood ingest.
  // Errors are queued like events (never sampled) and flushed in the same batch.
  var ERROR_DEDUPE_MS = 10000;
  var ERROR_MAX_PER_PAGE = 50;
  var recentErrors = {};
  var errorsSent = 0;

  function emitError(payload) {
    if (!payload || !payload.message) return;
    if (errorsSent >= ERROR_MAX_PER_PAGE) return;
    var signature = payload.message + '|' + (payload.stack ? payload.stack.split('\n')[0] : '');
    var now = Date.now();
    if (recentErrors[signature] && now - recentErrors[signature] < ERROR_DEDUPE_MS) return;
    recentErrors[signature] = now;
    errorsSent += 1;

    var errExtra = {
      message: String(payload.message).slice(0, 2000),
      stack: payload.stack ? String(payload.stack).slice(0, 20000) : null,
      level: payload.level || 'error',
      handled: payload.handled === true,
      // error_type is the "choose what you want to see" dimension; capture_mode
      // is auto (a beacon listener fired) vs manual (recordError). Both fall back
      // from `handled` when the caller doesn't classify explicitly.
      error_type: payload.errorType || (payload.handled === true ? 'reported' : 'exception'),
      capture_mode: payload.captureMode || (payload.handled === true ? 'manual' : 'auto')
    };
    // A feature flow that fails passes its trace/span so the error is tied to
    // the feature it happened in, even when auto request-tracing is off.
    if (payload.traceId) errExtra.trace_id = payload.traceId;
    if (payload.spanId) errExtra.parent_span_id = payload.spanId;
    enqueue(applyBeforeSend(buildEnvelope('error', payload.metadata, errExtra)));
  }

  // --- Client logs (PR 2.6) ----------------------------------------------------
  // log(level, message, meta) emits a faceted log line through the batch. Never
  // sampled. The optional console hook mirrors console.warn/error into logs.
  var LOG_LEVELS = { debug: 1, info: 1, warn: 1, error: 1 };
  function emitLog(level, message, meta) {
    if (message == null || message === '') return;
    var lvl = LOG_LEVELS[level] ? level : 'info';
    enqueue(applyBeforeSend(buildEnvelope('log', meta, {
      level: lvl,
      message: String(message).slice(0, 4000)
    })));
  }

  if (config.captureConsole && window.console) {
    ['warn', 'error'].forEach(function (method) {
      var original = console[method];
      console[method] = function () {
        try {
          emitLog(method, Array.prototype.map.call(arguments, function (a) {
            return (a && a.message) ? a.message : String(a);
          }).join(' '));
        } catch (_err) {}
        if (typeof original === 'function') return original.apply(console, arguments);
      };
    });
  }

  // --- identify / group (unchanged join semantics) -----------------------------
  function identify(uid, traits) {
    if (!uid) return;
    userRef = String(uid);
    persist('pf_usage_user_id', userRef);
    traits = traits || {};
    post(endpoints.identify, {
      product_id: config.pipelineId,
      key: config.writeKey,
      user_id: userRef,
      stripe_customer_id: traits.stripe_customer_id || traits.stripeCustomerId || null,
      email: traits.email || null,
      group_id: groupId,
      traits: traits,
      // Session context so the server can backfill this session's earlier
      // anonymous events onto the now-known user_ref.
      session_id: currentSessionId(),
      visitor_id: visitorId
    });
  }
  function group(gid, traits) {
    if (!gid) return;
    groupId = String(gid);
    persist('pf_usage_group_id', groupId);
    if (userRef) identify(userRef, Object.assign({ group_id: groupId }, traits || {}));
  }

  window.addEventListener('error', function (event) {
    var err = event && event.error;
    emitError({
      message: (err && err.message) || event.message || 'Unknown error',
      stack: err && err.stack,
      handled: false,
      errorType: 'exception',
      captureMode: 'auto'
    });
  });
  window.addEventListener('unhandledrejection', function (event) {
    var reason = event && event.reason;
    emitError({
      message: (reason && reason.message) || String(reason) || 'Unhandled promise rejection',
      stack: reason && reason.stack,
      handled: false,
      errorType: 'unhandled_rejection',
      captureMode: 'auto'
    });
  });

  // --- Web vitals (PR 1.4) -----------------------------------------------------
  // Self-contained Core Web Vitals capture via PerformanceObserver — no external
  // dependency, no CDN/CSP concern. TTFB/FCP report as soon as they're known;
  // LCP/CLS/INP are finalized when the page is hidden and ride the unload flush.
  // Each metric is rated client-side with the same thresholds the backend uses.
  var VITAL_THRESHOLDS = { LCP: [2500, 4000], INP: [200, 500], FCP: [1800, 3000], TTFB: [800, 1800], CLS: [0.1, 0.25] };
  function rateVital(metric, value) {
    var t = VITAL_THRESHOLDS[metric];
    if (!t || value == null) return null;
    if (value <= t[0]) return 'good';
    if (value <= t[1]) return 'needs-improvement';
    return 'poor';
  }

  var vitalsReported = {};
  var vitalsNavId = newId();
  var clsValue = 0, lcpValue = null, inpValue = 0;

  function reportVital(metric, value) {
    if (value == null || vitalsReported[metric]) return;
    vitalsReported[metric] = true;
    var rounded = metric === 'CLS' ? Math.round(value * 1000) / 1000 : Math.round(value);
    // Vitals are low-volume and never sampled — enqueue straight onto the batch.
    enqueue(applyBeforeSend(buildEnvelope('vital', null, {
      metric: metric, value: rounded, rating: rateVital(metric, rounded), navigation_id: vitalsNavId
    })));
  }
  function finalizeVitals() {
    reportVital('LCP', lcpValue);
    if (clsValue > 0) reportVital('CLS', clsValue);
    if (inpValue > 0) reportVital('INP', inpValue);
  }

  (function setupVitals() {
    if (typeof PerformanceObserver === 'undefined') return;
    try {
      var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
      if (nav && nav.responseStart > 0) reportVital('TTFB', nav.responseStart);
    } catch (_err) {}

    function observe(type, cb, extra) {
      try {
        var po = new PerformanceObserver(function (list) { cb(list.getEntries()); });
        var opts = { type: type, buffered: true };
        if (extra) { for (var k in extra) opts[k] = extra[k]; }
        po.observe(opts);
      } catch (_err) {}
    }

    observe('paint', function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].name === 'first-contentful-paint') reportVital('FCP', entries[i].startTime);
      }
    });
    observe('largest-contentful-paint', function (entries) {
      var last = entries[entries.length - 1];
      if (last) lcpValue = last.renderTime || last.loadTime || last.startTime || lcpValue;
    });
    observe('layout-shift', function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (!entries[i].hadRecentInput) clsValue += entries[i].value;
      }
    });
    observe('event', function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].duration > inpValue) inpValue = entries[i].duration;
      }
    }, { durationThreshold: 40 });
  })();

  // --- Tracing: fetch/XHR spans (opt-in) --------------------------------------
  // Each request becomes a client span (timed, status-tagged) hung off the page
  // root, and same-origin requests carry a W3C traceparent so the backend can
  // continue the trace. Everything is wrapped in try/catch and always defers to
  // the native call — instrumentation must never break the host page's network.
  function emitSpan(span) {
    if (!traceEnabled || !span || !span.spanId || !span.name) return;
    enqueue(applyBeforeSend(buildEnvelope('span', span.attributes || null, {
      span_id: span.spanId,
      parent_span_id: (span.parentSpanId !== undefined) ? span.parentSpanId : activeSpanId,
      name: String(span.name).slice(0, 200),
      span_kind: 'client',
      service: 'web',
      status: span.status || null,
      duration_ms: (span.durationMs != null) ? Math.round(span.durationMs) : null,
      occurred_at: span.startedAt || new Date().toISOString()
    })));
  }

  // --- Feature flows (manual spans, PR 3.x) -----------------------------------
  // A "feature" is a named user flow — Sign Up, Checkout — instrumented with a
  // start and an end. pf.feature(name, fn) wraps the flow (auto-closing); the
  // explicit pf.startFeature(name) returns a handle for flows that span user
  // think-time. The flow becomes one span tagged feature=name, so Monitor can
  // group usage/errors/latency by feature instead of URL — and works even with
  // request-tracing off (it lazily opens a trace). Capture is never sampled.
  function ensureTraceId() { if (!traceId) traceId = randomHex(16); return traceId; }

  function emitManualSpan(span) {
    if (!span || !span.spanId || !span.name) return;
    enqueue(applyBeforeSend(buildEnvelope('span', span.attributes || null, {
      trace_id: span.traceId,
      span_id: span.spanId,
      parent_span_id: (span.parentSpanId !== undefined) ? span.parentSpanId : null,
      name: String(span.name).slice(0, 200),
      span_kind: span.spanKind || 'internal',
      service: span.service || 'web',
      feature: span.feature || null,
      status: span.status || 'ok',
      duration_ms: (span.durationMs != null) ? Math.round(span.durationMs) : null,
      capture_mode: 'manual',
      occurred_at: span.startedAt || new Date().toISOString()
    })));
  }

  function startFeature(name) {
    var fname = String(name || 'feature').slice(0, 120);
    var tid = ensureTraceId();
    var spanId = randomHex(8);
    // Parent to the current span (the page root when tracing is on); otherwise
    // this feature span is the root of its own trace. We deliberately do NOT
    // move the global active span, so concurrent feature flows can't tangle.
    var parentId = activeSpanId;
    var startMs = nowMs();
    var startedAt = new Date().toISOString();
    var attrs = {};
    var ended = false;

    function close(status, err) {
      if (ended) return handle;
      ended = true;
      emitManualSpan({
        traceId: tid, spanId: spanId, parentSpanId: parentId, feature: fname, name: fname,
        spanKind: 'internal', status: status, durationMs: nowMs() - startMs, startedAt: startedAt,
        attributes: hasKeys(attrs) ? attrs : null
      });
      if (err) {
        emitError({
          message: (err && err.message) || String(err), stack: err && err.stack,
          handled: true, errorType: 'feature', captureMode: 'manual',
          metadata: { feature: fname }, traceId: tid, spanId: spanId
        });
      }
      return handle;
    }

    var handle = {
      attr: function (values) {
        if (values && typeof values === 'object') {
          for (var k in values) { if (Object.prototype.hasOwnProperty.call(values, k)) attrs[k] = values[k]; }
        }
        return handle;
      },
      step: function (stepName) {
        var sid = randomHex(8); var sStart = nowMs(); var sStarted = new Date().toISOString(); var sEnded = false;
        return { end: function (st) {
          if (sEnded) return;
          sEnded = true;
          emitManualSpan({ traceId: tid, spanId: sid, parentSpanId: spanId, feature: fname, name: String(stepName || 'step').slice(0, 200), spanKind: 'internal', status: (st === 'error') ? 'error' : 'ok', durationMs: nowMs() - sStart, startedAt: sStarted });
        } };
      },
      ok: function () { return close('ok'); },
      error: function (err) { return close('error', err || new Error('error')); },
      end: function (status) { return close(status === 'error' ? 'error' : 'ok'); }
    };
    return handle;
  }

  function hasKeys(obj) { for (var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) return true; } return false; }

  // Auto-closing wrapper: runs fn, closing the feature ok on return (awaiting a
  // returned promise) or error on throw/rejection. Without an fn it behaves like
  // startFeature. The flow's own value/exception is always passed through.
  function feature(name, fn) {
    var handle = startFeature(name);
    if (typeof fn !== 'function') return handle;
    try {
      var result = fn(handle);
      if (result && typeof result.then === 'function') {
        return result.then(function (value) { handle.ok(); return value; }, function (err) { handle.error(err); throw err; });
      }
      handle.ok();
      return result;
    } catch (err) {
      handle.error(err);
      throw err;
    }
  }

  function installFetchTracing() {
    if (typeof window.fetch !== 'function') return;
    var nativeFetch = window.fetch;
    window.fetch = function (input, init) {
      var url = urlString(input);
      var method = (init && init.method) || (input && input.method) || 'GET';
      // Never trace our own ingest calls (would recurse) or unresolvable URLs.
      if (!url || isIngestUrl(url)) return nativeFetch.apply(this, arguments);

      var spanId = randomHex(8);
      var parentId = activeSpanId;
      var startMs = nowMs();
      var startedAt = new Date().toISOString();
      var callArgs = arguments;
      // Same-origin only, so a simple cross-origin GET never becomes preflighted.
      try {
        if (sameOrigin(url)) {
          var headers = new Headers((init && init.headers) || (typeof input !== 'string' && input && input.headers) || undefined);
          headers.set('traceparent', traceparent(spanId));
          callArgs = [input, Object.assign({}, init, { headers: headers })];
        }
      } catch (_err) { callArgs = arguments; }

      function finish(status) {
        emitSpan({ spanId: spanId, parentSpanId: parentId, name: String(method).toUpperCase() + ' ' + pathOf(url), status: status, durationMs: nowMs() - startMs, startedAt: startedAt, attributes: { 'http.url': url, 'http.method': String(method).toUpperCase() } });
      }
      var p;
      try { p = nativeFetch.apply(this, callArgs); }
      catch (err) { finish('error'); throw err; }
      return p.then(function (res) { finish(res && res.ok ? 'ok' : 'error'); return res; }, function (err) { finish('error'); throw err; });
    };
  }

  function installXhrTracing() {
    if (typeof XMLHttpRequest === 'undefined') return;
    var open = XMLHttpRequest.prototype.open;
    var send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
      try { this.__pfTrace = { method: method, url: url }; } catch (_e) {}
      return open.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
      var ctx = this.__pfTrace;
      if (ctx && ctx.url && !isIngestUrl(ctx.url)) {
        var spanId = randomHex(8);
        var parentId = activeSpanId;
        var startMs = nowMs();
        var startedAt = new Date().toISOString();
        var self = this;
        try { if (sameOrigin(ctx.url)) this.setRequestHeader('traceparent', traceparent(spanId)); } catch (_e) {}
        try {
          this.addEventListener('loadend', function () {
            var ok = self.status >= 200 && self.status < 400;
            emitSpan({ spanId: spanId, parentSpanId: parentId, name: String(ctx.method || 'GET').toUpperCase() + ' ' + pathOf(ctx.url), status: ok ? 'ok' : 'error', durationMs: nowMs() - startMs, startedAt: startedAt, attributes: { 'http.url': ctx.url, 'http.method': String(ctx.method || 'GET').toUpperCase(), 'http.status': self.status } });
          });
        } catch (_e) {}
      }
      return send.apply(this, arguments);
    };
  }

  // Close the trace with a root page-load span so the request spans have a
  // parent to hang off. Rides the unload flush alongside the final vitals.
  function finalizeTrace() {
    if (!traceEnabled || traceFinalized) return;
    traceFinalized = true;
    var dur = nowMs() - traceStart;
    emitSpan({ spanId: rootSpanId, parentSpanId: null, name: 'pageview ' + pathOf(window.location.href), status: 'ok', durationMs: dur, startedAt: new Date(Date.now() - dur).toISOString(), attributes: { url: window.location.href } });
  }

  if (traceEnabled) {
    try { installFetchTracing(); } catch (_err) {}
    try { installXhrTracing(); } catch (_err) {}
  }

  // Flush on the page going away. visibilitychange->hidden is the reliable
  // signal on mobile (pagehide/unload often don't fire there); pagehide covers
  // desktop tab close and navigation. Finalize vitals + the trace first so they
  // ride the same beacon.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { finalizeVitals(); finalizeTrace(); flush(true); }
  });
  window.addEventListener('pagehide', function () { finalizeVitals(); finalizeTrace(); flush(true); });

  // Public API. Names preserved so sites already embedding the snippet keep
  // working without changes.
  window.problemFinderUsage = {
    record: emit,
    identify: identify,
    group: group,
    log: emitLog,
    recordError: function (message, metadata) {
      emitError({ message: message, handled: true, metadata: metadata, errorType: 'reported', captureMode: 'manual' });
    },
    feature: feature,
    startFeature: startFeature
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { emit('pageview', null, 'auto'); }, { once: true });
  } else {
    emit('pageview', null, 'auto');
  }
})();
