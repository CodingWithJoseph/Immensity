/**
 * Tracing integration test for the beacon (public/pf-usage.js).
 *
 * With data-trace enabled, the beacon wraps fetch to (a) attach a W3C
 * traceparent to same-origin requests and (b) emit a client span on the batch.
 * With it disabled, fetch is left untouched.
 */
import * as fs from 'fs'
import * as path from 'path'

const SRC = fs.readFileSync(path.join(__dirname, '..', 'public', 'pf-usage.js'), 'utf8')

// Minimal Headers shim if the test env doesn't provide one (the beacon does
// `new Headers(init).set(...)` and the mock reads `.get(...)`).
if (typeof (global as any).Headers === 'undefined') {
    (global as any).Headers = class {
        map: Record<string, string> = {}
        constructor(init?: any) {
            if (init instanceof (global as any).Headers) this.map = { ...init.map }
            else if (init && typeof init === 'object') for (const k of Object.keys(init)) this.map[k.toLowerCase()] = String(init[k])
        }
        set(k: string, v: string) { this.map[k.toLowerCase()] = String(v) }
        get(k: string) { return this.map[k.toLowerCase()] ?? null }
    }
}

function response(body: unknown, ok = true) {
    return Promise.resolve({ ok, status: ok ? 200 : 500, text: () => Promise.resolve(JSON.stringify(body)), json: () => Promise.resolve(body) } as Response)
}

type Call = { url: string; init: any }

function setupFetch(): Call[] {
    const calls: Call[] = []
    ;(global as any).fetch = jest.fn((input: any, init: any) => {
        const url = typeof input === 'string' ? input : (input && input.url) || ''
        calls.push({ url: String(url), init })
        return response({ success: true, stored: 1 })
    })
    ;(window as any).fetch = (global as any).fetch
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
    // eslint-disable-next-line no-eval
    ;(0, eval)(SRC)
}

describe('pf-usage tracing', () => {
    it('wraps fetch: traceparent on same-origin + span on the batch', async () => {
        jest.useFakeTimers()
        const calls = setupFetch()
        loadBeacon({ 'data-trace': 'true' })

        // Host page makes a same-origin request through the wrapped fetch.
        await (window as any).fetch('/api/cart')

        const hostCall = calls.find(c => c.url === '/api/cart')!
        expect(hostCall).toBeTruthy()
        const tp: string = hostCall.init.headers.get('traceparent')
        expect(tp).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/)
        const traceId = tp.split('-')[1]

        // Flush the queue and find the emitted span for this trace.
        jest.advanceTimersByTime(2100)
        await Promise.resolve()
        const batches = calls.filter(c => c.url.includes('/api/public/portfolio/batch')).map(c => JSON.parse(c.init.body))
        const items = batches.flatMap(b => b.batch)
        const span = items.find((i: any) => i.kind === 'span' && i.trace_id === traceId)
        expect(span).toBeTruthy()
        expect(span.name).toBe('GET /api/cart')
        expect(span.service).toBe('web')
        expect(span.span_kind).toBe('client')
        expect(span.span_id).toMatch(/^[0-9a-f]{16}$/)
    })

    it('leaves fetch untouched when tracing is disabled', async () => {
        const calls = setupFetch()
        const native = (window as any).fetch
        loadBeacon({})

        expect((window as any).fetch).toBe(native) // not wrapped

        await (window as any).fetch('/api/cart')
        const hostCall = calls.find(c => c.url === '/api/cart')!
        // No tracing layer ran, so no traceparent was attached.
        expect(hostCall.init === undefined || hostCall.init.headers === undefined).toBe(true)
    })
})
