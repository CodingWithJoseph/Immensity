import { deriveQuickRead } from '@/lib/portfolioQuickRead'
import type { PortfolioOverviewMetric } from '@/app/(core)/dashboard/(manage)/portfolio/types'
import type { PipelineCard } from '@/lib/types/cluster'
import type { Issue } from '@/lib/types/issue'

function metric(over: Partial<PortfolioOverviewMetric> & { metric: string }): PortfolioOverviewMetric {
    return {
        unit: 'count', currentTotal: 100, priorTotal: 50, comparisonCurrent: 100, comparisonDate: null,
        percentChange: 1, trendDirection: 'up', isPositiveTrend: true, points: [],
        ...over,
    } as PortfolioOverviewMetric
}

const product = { id: 'alpha', name: 'Alpha' } as PipelineCard
function issue(over: Partial<Issue>): Issue {
    return { id: 'i', pipelineId: 'alpha', project: { id: 'alpha', name: 'Alpha', stage: 'launched' }, title: 'x', ...over } as Issue
}

describe('deriveQuickRead', () => {
    it('returns null when there is nothing to summarise', () => {
        expect(deriveQuickRead([], [], [])).toBeNull()
        expect(deriveQuickRead(null, [], [])).toBeNull()
    })

    it('is upbeat and lists rising metrics when all is well', () => {
        const read = deriveQuickRead(
            [metric({ metric: 'traffic' }), metric({ metric: 'revenue' }), metric({ metric: 'errors', trendDirection: 'down', isPositiveTrend: true })],
            [product], [],
        )!
        expect(read.headline).toBe('Everything looks good.')
        expect(read.needsAttention).toBe(false)
        expect(read.lines).toContain('Traffic and Revenue are up this period.')
    })

    it('flags rising errors and products needing attention', () => {
        const read = deriveQuickRead(
            [
                metric({ metric: 'traffic' }),
                metric({ metric: 'errors', trendDirection: 'up', isPositiveTrend: false }),
            ],
            [product],
            [issue({ id: 'a', pipelineId: 'alpha' }), issue({ id: 'b', pipelineId: 'beta', project: { id: 'beta', name: 'Beta', stage: 'launched' } })],
        )!
        expect(read.headline).toBe('A few things need a look.')
        expect(read.needsAttention).toBe(true)
        expect(read.lines).toContain('Errors are up this period — worth a look.')
        // Two distinct products across the open issues.
        expect(read.lines).toContain('2 products need your attention.')
    })

    it('singularises a single product needing attention', () => {
        const read = deriveQuickRead(
            [metric({ metric: 'traffic', trendDirection: 'flat', isPositiveTrend: null })],
            [product],
            [issue({ id: 'a', pipelineId: 'alpha' })],
        )!
        expect(read.lines).toContain('1 product needs your attention.')
    })
})
