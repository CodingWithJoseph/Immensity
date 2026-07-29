import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Stub the React Flow graph: a button that selects the first node (n0) so we can
// drive the detail panel without a real canvas.
jest.mock('@/app/(core)/dashboard/(monitor)/monitor/components/FlowGraph', () => ({
    __esModule: true,
    default: ({ onSelect }: { onSelect: (id: string | null) => void }) => {
        const React = require('react')
        return React.createElement('button', { 'data-testid': 'graph', onClick: () => onSelect('n0') }, 'graph')
    },
}))

import FlowGraphView from '@/app/(core)/dashboard/(monitor)/monitor/components/FlowGraphView'

function response(body: unknown) {
    return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(body)), json: () => Promise.resolve(body) } as Response)
}

const FEATURE = {
    data: {
        windowDays: 14,
        nodes: [
            { feature: 'signup', count: 80, errorCount: 8, avgDurationMs: 1200 },
            { feature: 'checkout', count: 20, errorCount: 0, avgDurationMs: 300 },
        ],
        edges: [{ from: 'signup', to: 'checkout', count: 12 }],
    },
}
const PAGES = {
    data: {
        windowDays: 14,
        nodes: [{ url: 'https://app.test/home', visits: 80 }, { url: 'https://app.test/cart', visits: 20 }],
        edges: [{ from: 'https://app.test/home', to: 'https://app.test/cart', count: 18 }],
    },
}
const EMPTY = { data: { windowDays: 14, nodes: [], edges: [] } }

function mockFetch(feature: unknown, pages: unknown) {
    global.fetch = jest.fn((input: unknown) => {
        const url = String(input)
        if (url.includes('/feature-flow')) return response(feature)
        if (url.includes('/flow')) return response(pages)
        return response(EMPTY)
    }) as unknown as typeof fetch
}

describe('FlowGraphView', () => {
    it('defaults to feature flows and shows outcome metrics on select', async () => {
        mockFetch(FEATURE, PAGES)
        render(<FlowGraphView pipelineId="pipe-1" />)
        await screen.findByTestId('graph')

        expect(screen.getByText(/Named user flows/)).toBeInTheDocument()
        expect(screen.getByText('No feature selected')).toBeInTheDocument()

        fireEvent.click(screen.getByTestId('graph')) // selects signup (n0)
        await waitFor(() => expect(screen.getByText('signup')).toBeInTheDocument())
        expect(screen.getByText('80')).toBeInTheDocument()          // Runs
        expect(screen.getByText('10% errors')).toBeInTheDocument()  // error rate 8/80, shown as a Chip
        expect(screen.getByText('1.20s')).toBeInTheDocument()       // avg duration 1200ms
        expect(screen.getByText('checkout')).toBeInTheDocument() // leads to next
    })

    it('falls back to the URL flow when no feature flows are instrumented', async () => {
        mockFetch(EMPTY, PAGES)
        render(<FlowGraphView pipelineId="pipe-1" />)
        await screen.findByTestId('graph')
        expect(screen.getByText(/Aggregate page/)).toBeInTheDocument()
        expect(screen.getByText('No page selected')).toBeInTheDocument()
    })

    it('switches to the pages view via the toggle', async () => {
        mockFetch(FEATURE, PAGES)
        render(<FlowGraphView pipelineId="pipe-1" />)
        await screen.findByTestId('graph')
        fireEvent.click(screen.getByRole('button', { name: 'Pages' }))
        await waitFor(() => expect(screen.getByText(/Aggregate page/)).toBeInTheDocument())
    })

    it('shows the feature empty state when Features is chosen but none exist', async () => {
        mockFetch(EMPTY, PAGES)
        render(<FlowGraphView pipelineId="pipe-1" />)
        await screen.findByTestId('graph') // pages (fallback)
        fireEvent.click(screen.getByRole('button', { name: 'Features' }))
        await waitFor(() => expect(screen.getByText(/No feature flows yet/)).toBeInTheDocument())
    })
})
