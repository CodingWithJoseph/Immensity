/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Feature-flow instrumentation in the beacon (public/pf-usage.js).
 *
 * pf.feature(name, fn) / pf.startFeature(name) wrap a named user flow in a span
 * tagged feature=name (capture_mode 'manual'), tying its usage/latency/errors to
 * the feature. Works with request-tracing OFF (lazily opens a trace).
 */
import * as fs from 'fs'
import * as path from 'path'

const SRC = fs.readFileSync(path.join(__dirname, '..', 'public', 'pf-usage.js'), 'utf8')

type Call = { url: string; init: any }

function setupFetch(): Call[] {
    const calls: Call[] = []
    const fn = jest.fn((input: any, init: any) => {
        const url = typeof input === 'string' ? input : (input && input.url) || ''
        calls.push({ url: String(url), init })
        return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('{}'), json: () => Promise.resolve({}) } as Response)
    })
    ;(global as any).fetch = fn
    ;(window as any).fetch = fn
    return calls
}

function loadBeacon(attrs: Record<string, string>) {
    const script = document.createElement('script')
    script.setAttribute('data-product-id', 'pipe-1')
    script.setAttribute('data-key', 'wkey-1')
    for (const k of Object.keys(attrs)) script.setAttribute(k, attrs[k])
    ;(script as any).src = 'https://app.example.test/pf-usage.js'
    document.head.appendChild(script)
    Object.defineProperty(document, 'currentScript', { configurable: true, get: () => script })
    ;(0, eval)(SRC)
    return (window as any).problemFinderUsage
}

function flushedItems(calls: Call[]): any[] {
    jest.advanceTimersByTime(2100)
    return calls
        .filter(c => c.url.includes('/api/public/portfolio/batch'))
        .flatMap(c => JSON.parse(c.init.body).batch)
}

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

describe('pf-usage feature flows', () => {
    it('records a feature span with no request-tracing enabled', () => {
        const calls = setupFetch()
        const pf = loadBeacon({}) // note: no data-trace

        const ret = pf.feature('signup', () => 42)
        expect(ret).toBe(42) // the flow's own return value passes through

        const span = flushedItems(calls).find(i => i.kind === 'span' && i.feature === 'signup')
        expect(span).toBeTruthy()
        expect(span.capture_mode).toBe('manual')
        expect(span.span_kind).toBe('internal')
        expect(span.status).toBe('ok')
        expect(typeof span.duration_ms).toBe('number')
        expect(span.trace_id).toMatch(/^[0-9a-f]{32}$/)
        expect(span.span_id).toMatch(/^[0-9a-f]{16}$/)
    })

    it('marks a failed flow error and ties the error to the feature trace', () => {
        const calls = setupFetch()
        const pf = loadBeacon({})

        pf.startFeature('checkout').attr({ plan: 'pro' }).error(new Error('boom'))

        const items = flushedItems(calls)
        const span = items.find(i => i.kind === 'span' && i.feature === 'checkout')
        const err = items.find(i => i.kind === 'error' && i.metadata && i.metadata.feature === 'checkout')
        expect(span.status).toBe('error')
        expect(span.metadata.plan).toBe('pro') // attributes ride along
        expect(err).toBeTruthy()
        expect(err.message).toBe('boom')
        expect(err.trace_id).toBe(span.trace_id) // joined by trace_id
    })

    it('nests a step span under the feature span', () => {
        const calls = setupFetch()
        const pf = loadBeacon({})

        const flow = pf.startFeature('onboard')
        flow.step('verify-email').end()
        flow.ok()

        const spans = flushedItems(calls).filter(i => i.kind === 'span')
        const featureSpan = spans.find(s => s.name === 'onboard')
        const stepSpan = spans.find(s => s.name === 'verify-email')
        expect(stepSpan.parent_span_id).toBe(featureSpan.span_id)
        expect(stepSpan.feature).toBe('onboard')
    })

    it('closes ok after an async flow resolves', async () => {
        const calls = setupFetch()
        const pf = loadBeacon({})

        await pf.feature('async-flow', () => Promise.resolve('done'))

        const span = flushedItems(calls).find(i => i.kind === 'span' && i.feature === 'async-flow')
        expect(span.status).toBe('ok')
    })
})
