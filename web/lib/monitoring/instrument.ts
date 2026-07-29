// Typed wrapper over the beacon's feature-flow API (public/pf-usage.js).
//
// A "feature" is a named user flow instrumented with a start and an end; the
// flow becomes one span tagged with the feature name, so Monitor groups
// usage/errors/latency by feature instead of URL. Use `feature(name, fn)` to
// wrap a flow (auto-closes), or `startFeature(name)` for flows that span user
// think-time. Both are safe on the server and when the beacon hasn't loaded —
// they fall back to a no-op handle so app logic always runs.

export type FeatureStatus = 'ok' | 'error'

export interface FeatureStep {
    end(status?: FeatureStatus): void
}

export interface FeatureHandle {
    /** Attach searchable attributes to the feature span (method, plan, …). */
    attr(values: Record<string, unknown>): FeatureHandle
    /** Open a child span for a sub-step of the flow; call `.end()` to close it. */
    step(name: string): FeatureStep
    /** Close the flow as succeeded. */
    ok(): FeatureHandle
    /** Close the flow as failed, recording the error against the feature. */
    error(err: unknown): FeatureHandle
    /** Close the flow with an explicit status (defaults to ok). */
    end(status?: FeatureStatus): FeatureHandle
}

interface BeaconApi {
    feature?<T>(name: string, fn: (handle: FeatureHandle) => T): T
    startFeature?(name: string): FeatureHandle
}

function beacon(): BeaconApi | undefined {
    if (typeof window === 'undefined') return undefined
    return (window as unknown as { problemFinderUsage?: BeaconApi }).problemFinderUsage
}

const NOOP_STEP: FeatureStep = { end() {} }

const NOOP_HANDLE: FeatureHandle = {
    attr() { return NOOP_HANDLE },
    step() { return NOOP_STEP },
    ok() { return NOOP_HANDLE },
    error() { return NOOP_HANDLE },
    end() { return NOOP_HANDLE },
}

// Open a feature flow and get a handle to close it later. No-op handle when the
// beacon isn't present (SSR, or the snippet hasn't loaded yet).
export function startFeature(name: string): FeatureHandle {
    const api = beacon()
    return api?.startFeature ? api.startFeature(name) : NOOP_HANDLE
}

// Wrap a flow: the feature closes ok on return (awaiting a returned promise) or
// error on throw/rejection. The flow's own value/exception always passes
// through. When the beacon isn't present, `fn` still runs with a no-op handle.
export function feature<T>(name: string, fn: (handle: FeatureHandle) => T): T {
    const api = beacon()
    if (api?.feature) return api.feature(name, fn)
    return fn(NOOP_HANDLE)
}
