import fs from 'node:fs'
import path from 'node:path'
import { render, screen, waitFor } from '@testing-library/react'

const setSelectedPipelineId = jest.fn()
const mockFetchJson = jest.fn()

jest.mock('next/navigation', () => ({
    useSearchParams: () => new URLSearchParams(),
}))

jest.mock('@/app/(core)/dashboard/contexts/WorkspaceContext', () => ({
    useWorkspace: () => ({
        selectedPipelineId: 'beta',
        setSelectedPipelineId,
        hydrated: true,
    }),
}))

jest.mock('@/lib/fetchJson', () => ({
    fetchJson: (...args: unknown[]) => mockFetchJson(...args),
}))

import PortfolioDashboard from '@/app/(core)/dashboard/(manage)/portfolio/PortfolioDashboard'

const products = [
    { id: 'alpha', name: 'Alpha', displayName: 'Alpha', launchedAt: '2026-06-10', removedAt: null },
    { id: 'beta', name: 'Beta', displayName: 'Beta', launchedAt: '2026-06-20', removedAt: null },
]

const overviewMetrics = {
    comparisonDays: 7,
    sparklineDays: 14,
    metrics: ['traffic', 'usage', 'revenue', 'errors'].map(metric => ({
        metric,
        unit: metric === 'revenue' ? 'cents' : 'count',
        currentTotal: 0,
        priorTotal: 0,
        comparisonCurrent: 0,
        comparisonDate: null,
        percentChange: 0,
        trendDirection: 'flat',
        isPositiveTrend: null,
        points: Array.from({ length: 14 }, (_, index) => ({ date: `2026-06-${String(index + 17).padStart(2, '0')}`, value: 0 })),
    })),
}

function response(data: unknown): Promise<Response> {
    return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data })),
    } as Response)
}

beforeEach(() => {
    jest.clearAllMocks()
    mockFetchJson.mockImplementation((url: string) => Promise.resolve({
        data: url === '/api/portfolio/overview-metrics' ? overviewMetrics : products,
    }))
    global.fetch = jest.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith('/usage')) {
            return response({
                source: null,
                lastSeenAt: null,
                windowDays: 14,
                summary14d: { visitors: 0, pageviews: 0, activeUsers: 0, signups: 0, activations: 0 },
            })
        }
        if (url.endsWith('/revenue')) {
            return response({ connected: false, source: null, summary: { windowDays: 30, mrrCents: 0 } })
        }
        if (url.endsWith('/errors')) {
            return response({ source: null, windowDays: 14, summary14d: {}, recentErrors: [] })
        }
        if (url.endsWith('/correlation')) return response(null)
        const id = url.split('/').at(-1) ?? 'alpha'
        const item = products.find(product => product.id === id) ?? products[0]
        return response({ ...item, usageSource: null, revenueSource: null })
    }) as typeof fetch
})

describe('Manage Portfolio phase one', () => {
    it('loads launched products into the Portfolio table without changing workspace selection', async () => {
        render(<PortfolioDashboard view="portfolio" />)

        await waitFor(() => expect(mockFetchJson).toHaveBeenCalledWith('/api/portfolio'))
        await waitFor(() => expect(mockFetchJson).toHaveBeenCalledWith('/api/portfolio/overview-metrics'))
        expect(screen.getByRole('heading', { name: 'Launched Products' })).toBeInTheDocument()
        expect((await screen.findAllByText('Alpha')).length).toBeGreaterThanOrEqual(1)
        expect(screen.getByText('Beta')).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Alpha/ })).not.toBeInTheDocument()
        expect(screen.queryByText('Selected product')).not.toBeInTheDocument()
        expect(screen.queryByRole('heading', { name: 'Portfolio' })).not.toBeInTheDocument()
        expect(screen.queryByText('Manage and monitor your launched products.')).not.toBeInTheDocument()
        expect(setSelectedPipelineId).not.toHaveBeenCalled()
    })

    it('uses the Launch New placeholder instead of the previous standalone empty state', async () => {
        mockFetchJson.mockResolvedValue({ data: [] })

        render(<PortfolioDashboard view="portfolio" />)

        await waitFor(() => expect(mockFetchJson).toHaveBeenCalledWith('/api/portfolio'))
        expect(screen.getByRole('heading', { name: 'Launch New' })).toBeInTheDocument()
        expect(screen.queryByText('No launched products yet. Launch a project from Pipeline to see it here.')).not.toBeInTheDocument()
    })

    it('always shows the workspace picker, enabling it on scope-aware Manage pages', () => {
        const source = fs.readFileSync(
            path.join(process.cwd(), 'app', '(core)', 'dashboard', 'components', 'Sidebar.tsx'),
            'utf8',
        )

        // The picker is always rendered; only *enabled* where scope applies.
        expect(source).toContain("activeSection.key !== 'manage'")
        expect(source).toContain('pathname.startsWith(routes.core.calendar)')
        expect(source).toContain('pathname.startsWith(routes.core.issues)')
        expect(source).toContain('pathname.startsWith(routes.core.goals)')
        expect(source).toContain('<WorkspacePicker pathname={pathname} disabled={!pickerEnabled} />')
    })
})
