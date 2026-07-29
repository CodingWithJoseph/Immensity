import type { PipelineCard } from '@/lib/types/cluster'
import type { Issue } from '@/lib/types/issue'
import type { PortfolioOverviewMetric } from '@/app/(core)/dashboard/(manage)/portfolio/types'

export interface QuickRead {
    // Overall one-line verdict.
    headline: string
    // Supporting observations, most useful first.
    lines: string[]
    // Whether anything needs the user's attention (drives tone).
    needsAttention: boolean
}

const METRIC_LABELS: Record<string, string> = {
    traffic: 'Traffic',
    usage: 'Usage',
    revenue: 'Revenue',
    errors: 'Errors',
}

// Join labelled items into readable prose: "Traffic", "Traffic and revenue",
// "Traffic, usage and revenue".
function joinList(items: string[]): string {
    if (items.length <= 1) return items[0] ?? ''
    if (items.length === 2) return `${items[0]} and ${items[1]}`
    return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/**
 * Deterministic "quick read" over the portfolio: no ML, just ranked rules over
 * the same rollups the cards already show. Returns null when there's nothing to
 * summarise yet (so the card can fall back to its connect-data empty state).
 *
 * Rules, in priority order:
 *  1. Rising positive metrics (traffic / usage / revenue trending up).
 *  2. Errors trending up (a negative worth surfacing).
 *  3. Products with open issues needing attention.
 * The headline is upbeat unless a negative rule fired.
 */
export function deriveQuickRead(
    metrics: PortfolioOverviewMetric[] | null | undefined,
    products: PipelineCard[],
    attentionIssues: Issue[],
): QuickRead | null {
    const byName = new Map((metrics ?? []).map(metric => [metric.metric, metric]))
    const hasMetricData = (metrics ?? []).some(metric => metric.currentTotal != null && metric.currentTotal !== 0)
    if (!hasMetricData && products.length === 0) return null

    const lines: string[] = []

    // 1. Positive movers.
    const rising = (['traffic', 'usage', 'revenue'] as const)
        .filter(name => {
            const metric = byName.get(name)
            return metric?.trendDirection === 'up' && metric.isPositiveTrend === true
        })
        .map(name => METRIC_LABELS[name])
    if (rising.length > 0) {
        lines.push(`${joinList(rising)} ${rising.length === 1 ? 'is' : 'are'} up this period.`)
    }

    // 2. Errors climbing.
    const errors = byName.get('errors')
    const errorsUp = errors?.trendDirection === 'up' && errors.isPositiveTrend === false
    if (errorsUp) lines.push('Errors are up this period — worth a look.')

    // 3. Products needing attention (distinct products across open issues).
    const attentionProducts = new Set(
        attentionIssues
            .map(issue => issue.pipelineId ?? issue.project?.id)
            .filter((id): id is string => Boolean(id)),
    ).size
    if (attentionProducts > 0) {
        lines.push(`${attentionProducts} product${attentionProducts === 1 ? '' : 's'} need${attentionProducts === 1 ? 's' : ''} your attention.`)
    }

    const needsAttention = errorsUp || attentionProducts > 0
    if (lines.length === 0) {
        lines.push(products.length > 0 ? 'No notable changes this period.' : 'Launch a product to start tracking activity.')
    }

    return {
        headline: needsAttention ? 'A few things need a look.' : 'Everything looks good.',
        lines,
        needsAttention,
    }
}
