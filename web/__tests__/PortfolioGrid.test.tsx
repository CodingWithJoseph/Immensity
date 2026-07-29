import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import PortfolioGrid, { LifecyclePanel } from '@/app/(core)/dashboard/(manage)/portfolio/components/PortfolioGrid'
import type { PortfolioOverviewMetrics } from '@/app/(core)/dashboard/(manage)/portfolio/types'
import type { PipelineCard } from '@/lib/types/cluster'
import type { Issue } from '@/lib/types/issue'

// The Goals columns self-fetch; stub them so the grid tests stay pure.
jest.mock('@/app/(core)/dashboard/components/GoalsCards', () => ({
    __esModule: true,
    PortfolioGoalsColumns: (props: { productName?: string | null }) =>
        require('react').createElement('div', { 'data-testid': 'goals-columns' }, `goals:${props.productName ?? 'none'}`),
}))

const launchedProduct = {
    id: 'alpha',
    name: 'Alpha',
    displayName: 'Alpha Product',
    status: 'active',
    launchedAt: '2026-06-10',
    iconUrl: 'https://example.com/alpha.png',
} as PipelineCard

const overviewMetrics: PortfolioOverviewMetrics = {
    comparisonDays: 7,
    sparklineDays: 14,
    metrics: [
        { metric: 'traffic', unit: 'count', currentTotal: 120, priorTotal: 100, comparisonCurrent: 120, comparisonDate: null, percentChange: 0.2, trendDirection: 'up', isPositiveTrend: true, points: Array.from({ length: 14 }, (_, index) => ({ date: `2026-06-${String(index + 17).padStart(2, '0')}`, value: index + 1 })) },
        { metric: 'usage', unit: 'count', currentTotal: 80, priorTotal: 80, comparisonCurrent: 80, comparisonDate: null, percentChange: 0, trendDirection: 'flat', isPositiveTrend: null, points: Array.from({ length: 14 }, (_, index) => ({ date: `2026-06-${String(index + 17).padStart(2, '0')}`, value: index })) },
        { metric: 'revenue', unit: 'cents', currentTotal: 12500, priorTotal: 10000, comparisonCurrent: 12500, comparisonDate: '2026-05-30', percentChange: 0.25, trendDirection: 'up', isPositiveTrend: true, points: Array.from({ length: 14 }, (_, index) => ({ date: `2026-06-${String(index + 17).padStart(2, '0')}`, value: 10000 + index * 100 })) },
        { metric: 'errors', unit: 'count', currentTotal: 4, priorTotal: 8, comparisonCurrent: 4, comparisonDate: null, percentChange: -0.5, trendDirection: 'down', isPositiveTrend: true, points: Array.from({ length: 14 }, (_, index) => ({ date: `2026-06-${String(index + 17).padStart(2, '0')}`, value: 14 - index })) },
    ],
}

describe('Portfolio grid structure', () => {
    it('uses one responsive grid with the requested desktop spans', () => {
        const { container } = render(<PortfolioGrid />)
        const grid = container.firstElementChild

        expect(grid).toHaveClass(
            'grid',
            'grid-cols-1',
            'md:grid-cols-2',
            'xl:grid-cols-4',
            'xl:flex-1',
            'xl:min-h-[44rem]',
            'xl:grid-rows-[9.5rem_minmax(9rem,1fr)_minmax(12rem,1.75fr)_minmax(9rem,1fr)]',
            'gap-4',
            'items-stretch',
        )
        expect(screen.getByRole('region', { name: 'Goals' })).toHaveClass('xl:col-span-2', 'xl:col-start-2', 'xl:row-start-2')
        expect(screen.getByRole('heading', { name: 'Launched Products' }).closest('section')).toHaveClass('xl:col-span-3', 'xl:row-start-3')
        expect(screen.getByRole('heading', { name: 'Lifecycle' }).closest('section')).toHaveClass('xl:col-start-4', 'xl:row-span-2', 'xl:row-start-3')
        expect(screen.getByRole('heading', { name: 'Recent Insights' }).closest('section')).toHaveClass('xl:col-span-2', 'xl:row-start-4')
    })

    it('renders all requested placeholder card roles', () => {
        render(<PortfolioGrid />)

        for (const title of [
            'Traffic',
            'Usage',
            'Revenue',
            'Errors',
            'Quick Read',
            'Need Attention',
            'Launched Products',
            'Lifecycle',
            'Launch New',
            'Recent Insights',
        ]) {
            expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
        }
    })

    it('renders every placeholder with the shared shell background and centered copy', () => {
        render(<PortfolioGrid />)

        const messages = [
            'Connect your data sources to generate a quick read.',
            'No items need attention yet.',
            'Launch a product to see it here.',
            'Select a launched product to view its lifecycle.',
            'Launch a product when you are ready.',
            'Insights will appear as product data arrives.',
        ]

        for (const message of messages) {
            const copy = screen.getByText(message)
            const card = copy.closest('section')
            expect(card).toHaveClass('border-dashed', 'bg-(--color-card)', 'overflow-hidden')
            expect(copy.parentElement).toHaveClass('items-center', 'justify-center', 'text-center')
        }

        const trafficHeader = screen.getByRole('heading', { name: 'Traffic' })
        expect(trafficHeader.closest('section')).toHaveClass('h-full', 'min-h-[9.5rem]')
        expect(trafficHeader.closest('section')).toHaveClass('bg-(--color-card)')
        expect(trafficHeader.closest('section')).not.toHaveClass('border-dashed')
        // The revenue card now reads like every other metric card: a "No data"
        // headline, a neutral "No prior period" helper, and a "View revenue" link.
        expect(screen.getAllByText('No data')).toHaveLength(4)
        const revenueCard = screen.getByRole('heading', { name: 'Revenue' }).closest('section')!
        const revenueHelper = within(revenueCard).getByText('No prior period', { selector: 'span' }).closest('p')
        expect(revenueHelper).toHaveClass('inline-flex', 'gap-1.5', 'text-xs', 'font-semibold', 'text-(--color-text-muted)')
        expect(revenueHelper?.querySelector('[data-direction="neutral"]')).toBeInTheDocument()
        expect(screen.getAllByText('No prior period', { selector: 'span' })).toHaveLength(4)
        expect(within(revenueCard).getByRole('link', { name: 'View revenue' })).toHaveAttribute('href', '/dashboard/monitor/revenue')
        // Even with no data, every metric card still draws its graph as a flat
        // baseline line rather than leaving an empty gap.
        expect(screen.getAllByRole('img')).toHaveLength(4)
        const revenueGraph = within(revenueCard).getByRole('img', { name: 'revenue over the last 14 days' })
        expect(revenueGraph).toHaveAttribute('data-empty', 'true')
        expect(revenueGraph).toHaveAttribute('data-line-color', 'var(--color-blue)')
    })

    it('renders headline totals, comparison trends, and fourteen-day sparklines', () => {
        render(<PortfolioGrid overviewMetrics={overviewMetrics} />)

        expect(screen.getByRole('heading', { name: 'Traffic' }).closest('section')).not.toHaveClass('border-dashed')
        expect(screen.getByText('120')).toBeInTheDocument()
        expect(screen.getByText('$125')).toBeInTheDocument()
        expect(screen.getByText('Up 20% vs prior 7 days')).toBeInTheDocument()
        expect(screen.getByText('Up 25% vs prior 7 days')).toBeInTheDocument()
        expect(screen.getByText('Down 50% vs prior 7 days')).toBeInTheDocument()
        expect(screen.getByText('No change vs prior 7 days')).toBeInTheDocument()
        expect(screen.queryByText('30-day trend')).not.toBeInTheDocument()
        expect(screen.queryByText('30-day trend unavailable')).not.toBeInTheDocument()
        expect(screen.getAllByRole('img')).toHaveLength(4)
        expect(screen.getByRole('img', { name: 'traffic over the last 14 days' })).toBeInTheDocument()
        const trafficCard = screen.getByRole('heading', { name: 'Traffic' }).closest('section')!
        const errorCard = screen.getByRole('heading', { name: 'Errors' }).closest('section')!
        expect(trafficCard).toHaveClass('bg-(--color-card)')
        expect(trafficCard.querySelector('svg')).toHaveClass('text-(--color-text-muted)')
        expect(errorCard.querySelector('svg')).toHaveClass('text-(--color-error)')
        expect(screen.getByRole('img', { name: 'traffic over the last 14 days' })).toHaveAttribute('data-line-color', 'var(--color-blue)')
        expect(screen.getByRole('img', { name: 'errors over the last 14 days' })).toHaveAttribute('data-line-color', 'var(--color-error)')
        expect(screen.getByRole('heading', { name: 'Traffic' })).toHaveClass('uppercase', 'text-[11px]')
        expect(screen.getByRole('link', { name: 'View traffic' })).toHaveAttribute('href', '/dashboard/monitor/traffic')
        expect(screen.getByRole('link', { name: 'View usage' })).toHaveAttribute('href', '/dashboard/monitor/usage')
        expect(screen.getByRole('link', { name: 'View revenue' })).toHaveAttribute('href', '/dashboard/monitor/revenue')
        expect(screen.getByRole('link', { name: 'View errors' })).toHaveAttribute('href', '/dashboard/monitor/errors')
    })

    it('frames missing comparisons by the metric baseline', () => {
        const metrics = {
            ...overviewMetrics,
            metrics: overviewMetrics.metrics.map(metric => ({
                ...metric,
                priorTotal: 0,
                percentChange: null,
            })),
        }
        render(<PortfolioGrid overviewMetrics={metrics} />)

        expect(screen.getAllByText('No prior activity')).toHaveLength(4)
    })

    it('lists open product issues in Need Attention with product, title, and days since created', () => {
        const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
        const issue = (over: Partial<Issue>): Issue => ({
            id: 'i1', userId: 'u', teamId: null, assigneeId: null, assignee: null,
            pipelineId: 'alpha', project: { id: 'alpha', name: 'Alpha Product', stage: 'launched' },
            team: null, parentIssueId: null, title: 'Revenue not connected', summary: null,
            status: 'open', issueType: 'issue', position: 0, source: null, commentCount: 0,
            subIssueCount: 0, createdAt: daysAgo(3), updatedAt: null, closedAt: null, ...over,
        })
        render(<PortfolioGrid attentionIssues={[
            issue({}),
            issue({ id: 'i2', title: 'High error rate', project: { id: 'beta', name: 'Beta Product', stage: 'launched' }, createdAt: daysAgo(35) }),
            // No project → not tied to a product, so it is filtered out.
            issue({ id: 'i3', title: 'Personal note', project: null, pipelineId: null }),
        ]} />)

        const card = screen.getByRole('heading', { name: 'Need Attention' }).closest('section')!
        // Title = issue title; subtitle = "{product} · {days elapsed}".
        expect(within(card).getByText('Revenue not connected')).toBeInTheDocument()
        expect(within(card).getByText('Alpha Product · 3d')).toBeInTheDocument()
        expect(within(card).getByText('High error rate')).toBeInTheDocument()
        expect(within(card).getByText('Beta Product · 35d')).toBeInTheDocument()
        expect(within(card).queryByText('Personal note')).not.toBeInTheDocument()
        // Header count is the number of open product issues (the non-product one is excluded).
        expect(within(card).getByText('2')).toBeInTheDocument()
        expect(within(card).queryByText('No items need attention yet.')).not.toBeInTheDocument()
        expect(within(card).getByRole('link', { name: /View all issues/ })).toHaveAttribute('href', '/dashboard/manage/issues')
    })

    it('shows the Need Attention empty state when there are no product issues', () => {
        render(<PortfolioGrid />)
        expect(screen.getByText('No items need attention yet.')).toBeInTheDocument()
    })

    it('renders launched products in the reusable table', () => {
        render(<PortfolioGrid products={[launchedProduct]} />)

        for (const column of [
            'Product',
            'Status',
            'Days since launch',
            'Last event',
            'Revenue',
            'Traffic',
            'Errors',
            'Health',
        ]) {
            expect(screen.getByRole('columnheader', { name: column })).toBeInTheDocument()
        }
        expect(screen.queryByRole('columnheader', { name: 'Actions' })).not.toBeInTheDocument()
        expect(screen.queryByRole('columnheader', { name: 'Launched' })).not.toBeInTheDocument()

        expect(screen.getAllByText('Alpha Product')).toHaveLength(2)
        expect(screen.getByText('1 product')).toBeInTheDocument()
        expect(screen.getByRole('searchbox', { name: 'Search products' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument()
        expect(screen.getAllByText('Live').every(label => label.parentElement?.classList.contains('bg-[var(--chip-success-bg)]'))).toBe(true)
        expect(screen.getAllByText('No data').some(label => label.parentElement?.classList.contains('bg-[var(--chip-warning-bg)]'))).toBe(true)
        expect(screen.getAllByText('0%')).toHaveLength(3)
        const tableTriangles = within(screen.getByRole('table')).getAllByTestId('trend-triangle')
        expect(tableTriangles).toHaveLength(3)
        for (const triangle of tableTriangles) {
            expect(triangle).toHaveAttribute('data-direction', 'neutral')
            expect(triangle.tagName).toBe('SPAN')
        }
        expect(screen.getByLabelText('No event data').firstElementChild).toHaveClass('bg-(--color-text-faint)')
        expect(screen.getByRole('link', { name: 'Open in Monitor' })).toHaveAttribute(
            'href',
            '/dashboard/monitor/command-center?pipelineId=alpha',
        )
        expect(screen.getByRole('button', { name: 'Pause project' })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Sunset product' })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Retire product' })).not.toBeInTheDocument()
        expect(screen.getByLabelText('Update product icon')).toHaveAttribute('accept', 'image/png,image/jpeg,image/webp,image/gif')
        expect(Array.from(document.querySelectorAll('img')).some(image => image.getAttribute('src') === launchedProduct.iconUrl)).toBe(true)
        expect(screen.getAllByText('—')).toHaveLength(4)

        const selectedRow = screen.getByText('Alpha Product', { selector: 'span' }).closest('tr')
        expect(selectedRow).toHaveAttribute('aria-selected', 'true')
        expect(selectedRow).toHaveClass('bg-(--color-blue-soft)')

        const card = screen.getByRole('heading', { name: 'Launched Products' }).closest('section')
        expect(card).toHaveClass('bg-(--color-card)', 'overflow-hidden')
        expect(card).not.toHaveClass('border-dashed')

        const table = screen.getByRole('table').closest('section')
        expect(table).toHaveClass(
            '-mx-4',
            'w-[calc(100%+2rem)]',
            '[&_td]:whitespace-nowrap',
            '[&_thead]:bg-transparent',
        )
        expect(table).toHaveClass('h-full', 'min-h-0', 'flex-col', 'bg-(--color-card)')
        expect(table?.querySelector(':scope > div:last-child')).toHaveClass('overflow-auto', 'flex-1', 'min-h-0')
        expect(screen.getByRole('heading', { name: 'Lifecycle' }).closest('section')?.querySelector('.overflow-y-auto')).toBeInTheDocument()
    })

    it('truncates long product names and filters products by search and status', () => {
        const longNameProduct = {
            ...launchedProduct,
            id: 'long-name',
            displayName: '12345678901234567890',
        } as PipelineCard
        const pausedProduct = {
            ...launchedProduct,
            id: 'paused',
            displayName: 'Paused Product',
            status: 'paused',
        } as PipelineCard

        render(<PortfolioGrid products={[longNameProduct, pausedProduct]} />)

        expect(screen.getByText('2 products')).toBeInTheDocument()
        expect(screen.getByText('12345678901234…')).toHaveAttribute('title', '12345678901234567890')

        fireEvent.change(screen.getByRole('searchbox', { name: 'Search products' }), {
            target: { value: 'Paused' },
        })
        expect(screen.getAllByText('Paused Product')).toHaveLength(2)
        expect(screen.queryByText('12345678901234…')).not.toBeInTheDocument()

        fireEvent.change(screen.getByRole('searchbox', { name: 'Search products' }), {
            target: { value: '' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
        fireEvent.click(screen.getByRole('button', { name: 'Paused' }))
        expect(screen.getByRole('button', { name: 'Filters (1)' })).toBeInTheDocument()
        expect(screen.getAllByText('Paused Product')).toHaveLength(2)
        expect(screen.queryByText('12345678901234…')).not.toBeInTheDocument()

        const pausedChips = screen.getAllByText('Paused').map(label => label.parentElement)
        expect(pausedChips.some(chip => chip?.classList.contains('bg-[var(--chip-warning-bg)]'))).toBe(true)
        expect(screen.getAllByText('No data').some(label => label.parentElement?.classList.contains('bg-[var(--chip-warning-bg)]'))).toBe(true)
    })

    it('selects rows, sorts columns, and clears selection when filters hide every product', () => {
        const betaProduct = { ...launchedProduct, id: 'beta', displayName: 'Beta Product' } as PipelineCard
        render(<PortfolioGrid products={[betaProduct, launchedProduct]} />)

        fireEvent.click(screen.getByText('Beta Product', { selector: 'span' }).closest('tr')!)
        expect(screen.getAllByText('Beta Product')).toHaveLength(2)

        const productSort = screen.getByRole('button', { name: /Product/ })
        fireEvent.click(productSort)
        fireEvent.click(productSort)
        const dataRows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
        expect(within(dataRows[0]).getByText('Beta Product')).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
        fireEvent.click(screen.getByRole('button', { name: 'Healthy' }))
        expect(screen.getByText('No products match your search and filters.')).toBeInTheDocument()
        expect(screen.getByText('Select a launched product to view its lifecycle.')).toBeInTheDocument()
    })

    it('keeps lifecycle mutations in the Lifecycle panel', async () => {
        const onUpdate = jest.fn()
        const originalFetch = global.fetch
        const fetchMock = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ data: { ...launchedProduct, status: 'paused' } }),
        } as Response)
        global.fetch = fetchMock

        render(<LifecyclePanel product={launchedProduct} onUpdate={onUpdate} />)
        fireEvent.click(screen.getByRole('button', { name: 'Pause project' }))

        await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/pipeline/alpha', expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ status: 'paused' }),
        })))
        expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: 'alpha', status: 'paused' }))
        global.fetch = originalFetch
    })
})

