import { render, screen, within } from '@testing-library/react'
import TraceView from '@/app/(core)/dashboard/(monitor)/monitor/components/TraceView'

function response(body: unknown) {
    return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(body)), json: () => Promise.resolve(body) } as Response)
}

function span(spanId: string, parentSpanId: string | null, over: Partial<any> = {}) {
    return {
        id: `id-${spanId}`, traceId: 'T', spanId, parentSpanId,
        name: over.name ?? spanId, kind: over.kind ?? 'client', service: over.service ?? 'web',
        feature: null, platform: 'web', status: over.status ?? 'ok', release: null, environment: null,
        durationMs: over.durationMs ?? 12, startAt: '2026-06-01T12:00:00Z', attributes: {}, depth: over.depth ?? 0,
    }
}

const TRACE = {
    data: {
        traceId: 'T',
        spans: [
            span('root', null, { name: 'pageview /cart', depth: 0 }),
            span('fetch1', 'root', { name: 'GET /api/cart', status: 'error', depth: 1 }),
            span('srv1', 'fetch1', { name: 'GET /api/cart', kind: 'server', service: 'backend', status: 'error', depth: 2 }),
        ],
        errors: [{ id: 'e1', pipelineId: 'p', groupId: 'g', fingerprint: 'f', message: 'TypeError: boom', stack: null, level: 'error', handled: false, url: null, release: null, traceId: 'T', spanId: 'fetch1', visitorId: null, sessionId: null, userId: null, metadata: {}, occurredAt: null, receivedAt: null }],
        logs: [],
        summary: { spanCount: 3, errorCount: 1, logCount: 0, services: ['web', 'backend'], hasServer: true, durationMs: 140 },
    },
}

describe('TraceView', () => {
    beforeEach(() => {
        global.fetch = jest.fn(() => response(TRACE)) as unknown as typeof fetch
    })

    it('renders the span chain, the frontend→backend badge, and pins the error to its span', async () => {
        render(<TraceView pipelineId="p" traceId="T" onBack={() => {}} />)

        // All three spans render.
        await screen.findByText('pageview /cart')
        expect(screen.getAllByText('GET /api/cart')).toHaveLength(2)

        // hasServer surfaces the chain badge + a server-kind span.
        expect(screen.getByText('frontend → backend')).toBeInTheDocument()
        expect(screen.getByText('server')).toBeInTheDocument()

        // The error is pinned (rendered inside the trace), tied to its span.
        expect(screen.getByText('TypeError: boom')).toBeInTheDocument()
    })
})
