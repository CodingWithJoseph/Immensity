'use client'

import Link from 'next/link'
import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react'
import { Activity, ChevronRight, ImagePlus } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts'
import DataTable, { type ColumnDef } from '@/components/ui/DataTable'
import type { SortingState } from '@tanstack/react-table'
import StatusChip, { type StatusChipStatus } from '@/app/(core)/dashboard/components/StatusChip'
import HealthChip from '@/app/(core)/dashboard/components/HealthChip'
import { routes } from '@/app/util/routes'
import {
    PORTFOLIO_PRODUCT_STATUSES,
    type PipelineCard,
    type PortfolioProductStatus,
} from '@/lib/types/cluster'
import type { Issue } from '@/lib/types/issue'
import { deriveQuickRead } from '@/lib/portfolioQuickRead'
import { PortfolioGoalsColumns } from '@/app/(core)/dashboard/components/GoalsCards'
import {
    SOURCE_HEALTH_STATES,
    type PortfolioOverviewMetric,
    type PortfolioOverviewMetricName,
    type PortfolioOverviewMetrics,
    type SourceHealthState,
} from '../types'

type LaunchedProductRow = {
    id: string
    product: string
    fullProductName: string
    iconUrl: string | null
    status: PortfolioProductStatus
    statusChip: StatusChipStatus
    health: SourceHealthState
    lastEvent: EventIndicator
    revenue: MetricValue
    traffic: MetricValue
    errors: MetricValue
    launchedAt: string | null
}

type TrendDirection = 'up' | 'neutral' | 'down'

type MetricValue = {
    value: string
    direction: TrendDirection
    percent: number
    sortValue: number | null
}

type EventIndicator = {
    value: string
    freshness: 'none' | 'recent' | 'stale' | 'critical'
    sortValue: number | null
}

type PortfolioGridProps = {
    products?: PipelineCard[]
    isLoadingProducts?: boolean
    overviewMetrics?: PortfolioOverviewMetrics | null
    isLoadingMetrics?: boolean
    attentionIssues?: Issue[]
    isLoadingIssues?: boolean
    selectedProductId?: string | null
    onSelectedProductIdChange?: (id: string | null) => void
    onProductUpdate?: (product: PipelineCard) => void
    onProductRemove?: (id: string) => void
}

const DAY_IN_MS = 24 * 60 * 60 * 1000
const PRODUCT_NAME_MAX_LENGTH = 15
const EMPTY_METRIC: MetricValue = { value: '—', direction: 'neutral', percent: 0, sortValue: null }
const EMPTY_EVENT: EventIndicator = { value: '—', freshness: 'none', sortValue: null }
const STATUS_LABELS: Record<PortfolioProductStatus, string> = {
    active: 'Live',
    paused: 'Paused',
    sunsetting: 'Sunsetting',
    retired: 'Retired',
    killed: 'Killed',
}
const statusFilters: Array<{ label: string; value: PortfolioProductStatus | 'all' }> = [
    { label: 'All statuses', value: 'all' },
    ...PORTFOLIO_PRODUCT_STATUSES.map(value => ({ label: STATUS_LABELS[value], value })),
]
const HEALTH_LABELS: Record<SourceHealthState, string> = {
    healthy: 'Healthy',
    warning: 'Warning',
    unhealthy: 'Unhealthy',
    'no-data': 'No data',
}
const healthFilters: Array<{ label: string; value: SourceHealthState | 'all' }> = [
    { label: 'All health', value: 'all' },
    ...SOURCE_HEALTH_STATES.map(value => ({ label: HEALTH_LABELS[value], value })),
]

function ProductIcon({ name, iconUrl, size = 'sm' }: { name: string; iconUrl?: string | null; size?: 'sm' | 'md' }) {
    const sizeClass = size === 'md' ? 'h-11 w-11 text-base' : 'h-7 w-7 text-xs'
    if (iconUrl) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={iconUrl} alt="" className={`${sizeClass} shrink-0 rounded-md object-cover`} />
        )
    }
    return (
        <span aria-hidden className={`grid ${sizeClass} shrink-0 place-items-center rounded-md bg-(--color-button) font-semibold text-(--color-on-button)`}>
            {(name.trim()[0] || 'P').toUpperCase()}
        </span>
    )
}

function truncateProductName(value: string) {
    if (value.length <= PRODUCT_NAME_MAX_LENGTH) return value
    return `${value.slice(0, PRODUCT_NAME_MAX_LENGTH - 1)}…`
}

function launchedStatus(product: PipelineCard): PortfolioProductStatus {
    const status = product.status?.toLowerCase()
    if (status && PORTFOLIO_PRODUCT_STATUSES.includes(status as PortfolioProductStatus)) {
        return status as PortfolioProductStatus
    }
    return 'active'
}

function statusChip(status: PortfolioProductStatus): StatusChipStatus {
    return status === 'active' ? 'live' : status
}

function daysSinceLaunch(value: string | null) {
    if (!value) return '—'
    const launchedAt = new Date(value)
    if (Number.isNaN(launchedAt.getTime())) return '—'
    const days = Math.max(0, Math.floor((Date.now() - launchedAt.getTime()) / DAY_IN_MS))
    return `${days} ${days === 1 ? 'day' : 'days'}`
}

// Compact "days since created" for the Need Attention list, e.g. "today", "3d".
function daysSinceCreated(value: string | null) {
    if (!value) return '—'
    const created = new Date(value)
    if (Number.isNaN(created.getTime())) return '—'
    const days = Math.max(0, Math.floor((Date.now() - created.getTime()) / DAY_IN_MS))
    return days === 0 ? 'today' : `${days}d`
}

const eventDotClass: Record<EventIndicator['freshness'], string> = {
    none: 'bg-(--color-text-faint)',
    recent: 'bg-(--color-success)',
    stale: 'bg-(--color-warning)',
    critical: 'bg-(--color-error)',
}

function TrendTriangle({ direction }: { direction: TrendDirection }) {
    const rotation = direction === 'neutral' ? 'rotate-90' : direction === 'down' ? 'rotate-180' : ''
    return (
        <span
            aria-hidden
            data-testid="trend-triangle"
            data-direction={direction}
            className={`inline-block h-0 w-0 border-b-[7px] border-l-4 border-r-4 border-b-current border-l-transparent border-r-transparent ${rotation}`}
        />
    )
}

function TrendMetric({ metric, positiveDirection }: { metric: MetricValue; positiveDirection: 'up' | 'down' }) {
    const tone = metric.direction === 'neutral'
        ? 'text-(--color-text-muted)'
        : metric.direction === positiveDirection
            ? 'text-(--color-success-text)'
            : 'text-(--color-error-text)'

    return (
        <span className="inline-flex items-center gap-2">
            <span>{metric.value}</span>
            <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${tone}`}>
                <TrendTriangle direction={metric.direction} />
                {Math.abs(metric.percent)}%
            </span>
        </span>
    )
}

function LastEvent({ event }: { event: EventIndicator }) {
    return (
        <span className="inline-flex items-center gap-2" aria-label={event.freshness === 'none' ? 'No event data' : undefined}>
            <span aria-hidden className={`h-2 w-2 rounded-full ${eventDotClass[event.freshness]}`} />
            <span>{event.value}</span>
        </span>
    )
}

const launchedProductColumns: ColumnDef<LaunchedProductRow>[] = [
    {
        accessorFn: row => row.fullProductName,
        id: 'product',
        header: 'Product',
        size: 140,
        cell: ({ row }) => (
            <span className="flex min-w-0 items-center gap-2">
                <ProductIcon name={row.original.fullProductName} iconUrl={row.original.iconUrl} />
                <span title={row.original.fullProductName} className="truncate font-medium">{row.original.product}</span>
            </span>
        ),
    },
    {
        accessorFn: row => row.status,
        id: 'status',
        header: 'Status',
        size: 90,
        cell: ({ row }) => <StatusChip status={row.original.statusChip} semantic />,
    },
    {
        accessorFn: row => row.launchedAt ? new Date(row.launchedAt).getTime() : Number.NEGATIVE_INFINITY,
        id: 'daysSinceLaunch',
        header: 'Days since launch',
        size: 120,
        cell: ({ row }) => <span className="whitespace-nowrap">{daysSinceLaunch(row.original.launchedAt)}</span>,
    },
    {
        accessorFn: row => row.lastEvent.sortValue ?? Number.NEGATIVE_INFINITY,
        id: 'lastEvent',
        header: 'Last event',
        size: 90,
        cell: ({ row }) => <LastEvent event={row.original.lastEvent} />,
    },
    {
        accessorFn: row => row.revenue.sortValue ?? Number.NEGATIVE_INFINITY,
        id: 'revenue',
        header: 'Revenue',
        size: 100,
        cell: ({ row }) => <TrendMetric metric={row.original.revenue} positiveDirection="up" />,
    },
    {
        accessorFn: row => row.traffic.sortValue ?? Number.NEGATIVE_INFINITY,
        id: 'traffic',
        header: 'Traffic',
        size: 100,
        cell: ({ row }) => <TrendMetric metric={row.original.traffic} positiveDirection="up" />,
    },
    {
        accessorFn: row => row.errors.sortValue ?? Number.NEGATIVE_INFINITY,
        id: 'errors',
        header: 'Errors',
        size: 100,
        cell: ({ row }) => <TrendMetric metric={row.original.errors} positiveDirection="down" />,
    },
    {
        accessorFn: row => row.health,
        id: 'health',
        header: 'Health',
        size: 80,
        cell: ({ row }) => <HealthChip health={row.original.health} semantic />,
    },
]


type CardProps = {
    title: string
    emptyMessage: string
    headerMeta?: ReactNode
    headerActions?: ReactNode
    className?: string
    children?: ReactNode
}

function PortfolioCard({ title, emptyMessage, headerMeta, headerActions, className = '', children }: CardProps) {
    const isEmpty = children == null

    return (
        <section className={`box-border flex min-h-28 min-w-0 flex-col overflow-hidden rounded-md border border-(--color-border) bg-(--color-card) p-4 xl:min-h-0 ${isEmpty ? 'border-dashed' : ''} ${className}`}>
            {(headerMeta || headerActions) ? (
                <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 sm:flex-nowrap">
                    <h2 className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-(--color-text)">{title}</h2>
                    {headerMeta && <div className="shrink-0">{headerMeta}</div>}
                    {headerActions && <div className="flex min-w-0 items-center gap-2 sm:ml-auto">{headerActions}</div>}
                </div>
            ) : (
                <h2 className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-(--color-text)">{title}</h2>
            )}
            {isEmpty ? (
                <div className="flex min-h-0 flex-1 items-center justify-center px-4 text-center">
                    <p className="max-w-sm text-sm text-(--color-text-muted)">{emptyMessage}</p>
                </div>
            ) : (
                <div className="mt-3 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
            )}
        </section>
    )
}

function formatOverviewValue(metric: PortfolioOverviewMetric) {
    if (metric.currentTotal == null) return '—'
    if (metric.unit === 'cents') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(metric.currentTotal / 100)
    }
    return metric.currentTotal.toLocaleString()
}

function noPriorLabel(priorTotal?: number | null) {
    return priorTotal === 0 ? 'No prior activity' : 'No prior period'
}

function formatOverviewTrend(metric: PortfolioOverviewMetric) {
    if (metric.percentChange == null || metric.priorTotal == null) return noPriorLabel(metric.priorTotal)
    const comparison = 'prior 7 days'
    if (metric.trendDirection === 'flat') return `No change vs ${comparison}`
    const direction = metric.trendDirection === 'up' ? 'Up' : 'Down'
    return `${direction} ${Math.abs(Math.round(metric.percentChange * 100))}% vs ${comparison}`
}

function PortfolioMetricSparkline({ metricName, metric }: { metricName: PortfolioOverviewMetricName; metric?: PortfolioOverviewMetric }) {
    const rawPoints = metric?.points ?? []
    const hasValues = rawPoints.some(point => point.value != null)
    const stroke = metricName === 'errors' ? 'var(--color-error)' : 'var(--color-blue)'
    // Always draw the graph. With no data we still render a flat baseline line
    // (values coerced to zero, fixed domain) so the card reads like the others
    // instead of leaving an empty gap.
    const data = (hasValues
        ? rawPoints
        : rawPoints.length >= 2
            ? rawPoints
            : [{ date: 'start', value: 0 }, { date: 'end', value: 0 }]
    ).map(point => ({ ...point, value: point.value ?? 0 }))

    return (
        <div className="min-h-0 w-full min-w-0 flex-1" role="img" aria-label={`${metricName} over the last 14 days`} data-line-color={stroke} data-empty={hasValues ? undefined : 'true'}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 3, right: 1, bottom: 3, left: 1 }}>
                    <YAxis hide domain={hasValues ? ['dataMin', 'dataMax'] : [-1, 1]} />
                    <Line
                        type={hasValues ? 'monotone' : 'linear'}
                        dataKey="value"
                        stroke={stroke}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                        connectNulls={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}

const METRIC_CARD_CONFIG: Record<PortfolioOverviewMetricName, {
    title: string
    href: string
    linkLabel: string
    emptyMessage: string
}> = {
    traffic: { title: 'Traffic', href: routes.core.monitorTraffic, linkLabel: 'View traffic', emptyMessage: 'No prior period' },
    usage: { title: 'Usage', href: routes.core.monitorUsage, linkLabel: 'View usage', emptyMessage: 'No prior period' },
    revenue: { title: 'Revenue', href: routes.core.monitorRevenue, linkLabel: 'View revenue', emptyMessage: 'No prior period' },
    errors: { title: 'Errors', href: routes.core.monitorErrors, linkLabel: 'View errors', emptyMessage: 'No prior period' },
}

export function MetricCard({
    metricName,
    metric,
    isLoading = false,
}: { metricName: PortfolioOverviewMetricName; metric?: PortfolioOverviewMetric; isLoading?: boolean }) {
    const config = METRIC_CARD_CONFIG[metricName]
    const hasValue = metric?.currentTotal != null
    const href = config.href
    const linkLabel = config.linkLabel
    const headerIcon = <Activity aria-hidden className={`h-4 w-4 ${metricName === 'errors' ? 'text-(--color-error)' : 'text-(--color-text-muted)'}`} />
    if (isLoading) {
        return (
            <PortfolioCard title={config.title} emptyMessage={config.emptyMessage} headerActions={headerIcon} className="h-full min-h-[9.5rem]">
                <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
                    <div className="flex min-w-0 items-baseline gap-2 overflow-hidden">
                        <p className="truncate text-2xl font-semibold text-(--color-text)">Loading…</p>
                        <p className="min-w-0 truncate text-xs text-(--color-text-muted)">Loading metric data</p>
                    </div>
                    <div aria-hidden className="flex-1" />
                    <span className="text-xs text-(--color-text-muted)">{config.linkLabel}</span>
                </div>
            </PortfolioCard>
        )
    }
    if (!metric || !hasValue) {
        return (
            <PortfolioCard title={config.title} emptyMessage={config.emptyMessage} headerActions={headerIcon} className="h-full min-h-[9.5rem]">
                <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
                    <div className="flex min-w-0 items-baseline gap-2 overflow-hidden">
                        <p className="truncate text-2xl font-semibold text-(--color-text)">No data</p>
                        <p className="inline-flex min-w-0 items-center gap-1.5 truncate text-xs font-semibold text-(--color-text-muted)">
                            <TrendTriangle direction="neutral" />
                            <span className="truncate">{noPriorLabel()}</span>
                        </p>
                    </div>
                    <PortfolioMetricSparkline metricName={metricName} metric={metric} />
                    <Link href={href} className="inline-flex min-w-0 items-center justify-between gap-2 text-xs font-semibold text-(--color-link) hover:text-(--color-link-hover)">
                        <span className="truncate">{linkLabel}</span><ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0" />
                    </Link>
                </div>
            </PortfolioCard>
        )
    }

    const trendTone = metric.isPositiveTrend === true
        ? 'text-(--color-success-text)'
        : metric.isPositiveTrend === false
            ? 'text-(--color-error-text)'
            : 'text-(--color-text-muted)'
    const triangleDirection: TrendDirection = metric.trendDirection === 'flat' ? 'neutral' : metric.trendDirection

    return (
        <PortfolioCard title={config.title} emptyMessage={config.emptyMessage} headerActions={headerIcon} className="h-full min-h-[9.5rem]">
            <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
                <div className="flex min-w-0 items-baseline gap-2 overflow-hidden">
                    <p className="truncate text-3xl font-semibold tracking-[-0.02em] text-(--color-text)">{formatOverviewValue(metric)}</p>
                    <p className={`inline-flex min-w-0 items-center gap-1.5 truncate text-xs font-semibold ${trendTone}`}>
                        <TrendTriangle direction={triangleDirection} />
                        <span className="truncate">{formatOverviewTrend(metric)}</span>
                    </p>
                </div>
                <PortfolioMetricSparkline metricName={metricName} metric={metric} />
                <Link href={href} className="inline-flex min-w-0 items-center justify-between gap-2 text-xs font-semibold text-(--color-link) hover:text-(--color-link-hover)">
                    <span className="truncate">{linkLabel}</span><ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0" />
                </Link>
            </div>
        </PortfolioCard>
    )
}

export function QuickReadCard({
    overviewMetrics,
    products = [],
    attentionIssues = [],
}: {
    overviewMetrics?: PortfolioOverviewMetrics | null
    products?: PipelineCard[]
    attentionIssues?: Issue[]
}) {
    const quickRead = deriveQuickRead(overviewMetrics?.metrics, products, attentionIssues)
    const className = 'min-h-36 xl:col-start-1 xl:row-start-2'
    if (!quickRead) {
        return <PortfolioCard title="Quick Read" emptyMessage="Connect your data sources to generate a quick read." className={className} />
    }

    const insightsHref = products[0] ? `${routes.core.monitorCommandCenter}?pipelineId=${products[0].id}` : null

    return (
        <PortfolioCard title="Quick Read" emptyMessage="Connect your data sources to generate a quick read." className={className}>
            <div className="flex min-h-0 flex-1 flex-col gap-2">
                <p className="text-sm font-semibold text-(--color-text)">{quickRead.headline}</p>
                <ul className="flex min-h-0 flex-1 flex-col gap-1">
                    {quickRead.lines.map(line => (
                        <li key={line} className="text-xs text-(--color-text-muted)">{line}</li>
                    ))}
                </ul>
                {insightsHref && (
                    <Link href={insightsHref} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-(--color-link) hover:text-(--color-link-hover)">
                        View insights<ChevronRight aria-hidden className="h-3.5 w-3.5" />
                    </Link>
                )}
            </div>
        </PortfolioCard>
    )
}

// The former "Monitoring Setup" slot now hosts the Goals — portfolio-level
// (account) goals and the selected product's goals, side by side.
export function MonitoringSetupCard({ selectedProductId = null, selectedProductName = null }: { selectedProductId?: string | null; selectedProductName?: string | null }) {
    return (
        <section aria-label="Goals" className="box-border flex min-h-36 min-w-0 flex-col overflow-hidden rounded-md border border-(--color-border) bg-(--color-card) p-4 md:col-span-2 xl:col-span-2 xl:col-start-2 xl:row-start-2 xl:min-h-0">
            {/* One shared title + one link, with a card-spanning bottom border. */}
            <div className="-mx-4 flex shrink-0 items-center justify-between gap-2 border-b border-(--color-border) px-4 pb-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-(--color-text)">Goals</h2>
                <Link href={routes.core.portfolio} className="inline-flex items-center gap-1 text-xs font-semibold text-(--color-link) hover:text-(--color-link-hover)">
                    View goals &amp; milestones<ChevronRight aria-hidden className="h-3.5 w-3.5" />
                </Link>
            </div>
            <PortfolioGoalsColumns selectedProductId={selectedProductId} productName={selectedProductName} />
        </section>
    )
}

export function NeedAttentionCard({ issues = [], isLoading = false }: { issues?: Issue[]; isLoading?: boolean }) {
    // Open issues tied to a product. Oldest first — the longest-outstanding items
    // are the ones that most need attention.
    const attention = issues
        .filter(issue => issue.project)
        .sort((left, right) => new Date(left.createdAt ?? 0).getTime() - new Date(right.createdAt ?? 0).getTime())
    const className = 'min-h-36 xl:col-start-4 xl:row-start-2'

    if (!isLoading && attention.length === 0) {
        return <PortfolioCard title="Need Attention" emptyMessage="No items need attention yet." className={className} />
    }

    // The "View all issues" link sits on the title line to free vertical room for rows.
    const viewAllLink = (
        <Link href={routes.core.issues} className="inline-flex items-center gap-1 text-xs font-semibold text-(--color-link) hover:text-(--color-link-hover)">
            View all issues<ChevronRight aria-hidden className="h-3.5 w-3.5" />
        </Link>
    )

    return (
        <PortfolioCard
            title="Need Attention"
            emptyMessage="No items need attention yet."
            headerMeta={<span className="text-[11px] font-semibold text-(--color-text-muted)">{attention.length}</span>}
            headerActions={viewAllLink}
            className={className}
        >
            {/* No scroll: render every row and let the taller card show as many
                fixed-height rows as fit; the rest are clipped by overflow-hidden. */}
            <ul className="min-h-0 flex-1 divide-y divide-(--color-border) overflow-hidden">
                {attention.map(issue => (
                    <li key={issue.id} className="flex h-12 shrink-0 flex-col justify-center gap-0.5">
                        <p className="truncate text-sm font-medium text-(--color-text)" title={issue.title}>{issue.title}</p>
                        <p className="truncate text-xs text-(--color-text-muted)">
                            {issue.project?.name ?? 'Untitled product'} · {daysSinceCreated(issue.createdAt)}
                        </p>
                    </li>
                ))}
            </ul>
        </PortfolioCard>
    )
}

function sortRows(rows: LaunchedProductRow[], sorting: SortingState) {
    const activeSort = sorting[0]
    if (!activeSort) return rows
    const value = (row: LaunchedProductRow): string | number => {
        switch (activeSort.id) {
            case 'product': return row.fullProductName.toLowerCase()
            case 'status': return row.status
            case 'daysSinceLaunch': return row.launchedAt ? new Date(row.launchedAt).getTime() : Number.NEGATIVE_INFINITY
            case 'lastEvent': return row.lastEvent.sortValue ?? Number.NEGATIVE_INFINITY
            case 'revenue': return row.revenue.sortValue ?? Number.NEGATIVE_INFINITY
            case 'traffic': return row.traffic.sortValue ?? Number.NEGATIVE_INFINITY
            case 'errors': return row.errors.sortValue ?? Number.NEGATIVE_INFINITY
            case 'health': return row.health
            default: return ''
        }
    }
    return [...rows].sort((left, right) => {
        const leftValue = value(left)
        const rightValue = value(right)
        const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
            ? leftValue - rightValue
            : String(leftValue).localeCompare(String(rightValue))
        return activeSort.desc ? -comparison : comparison
    })
}

export function LaunchedProductsCard({
    products,
    selectedProductId,
    onSelect,
    isLoading = false,
}: {
    products: PipelineCard[]
    selectedProductId: string | null
    onSelect: (id: string | null) => void
    isLoading?: boolean
}) {
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<PortfolioProductStatus | 'all'>('all')
    const [healthFilter, setHealthFilter] = useState<SourceHealthState | 'all'>('all')
    const [filtersOpen, setFiltersOpen] = useState(false)
    const [sorting, setSorting] = useState<SortingState>([])
    const rows = products.map(product => ({
        id: product.id,
        product: truncateProductName(product.displayName || product.name),
        fullProductName: product.displayName || product.name,
        iconUrl: product.iconUrl ?? null,
        status: launchedStatus(product),
        statusChip: statusChip(launchedStatus(product)),
        // The list endpoint does not expose health yet. Keep this explicit instead
        // of inferring health from lifecycle status.
        health: 'no-data' as const,
        lastEvent: EMPTY_EVENT,
        revenue: EMPTY_METRIC,
        traffic: EMPTY_METRIC,
        errors: EMPTY_METRIC,
        launchedAt: product.launchedAt,
    }))
    const normalizedSearch = searchQuery.trim().toLowerCase()
    const visibleRows = rows.filter(row => (
        (!normalizedSearch || row.fullProductName.toLowerCase().includes(normalizedSearch))
        && (statusFilter === 'all' || row.status === statusFilter)
        && (healthFilter === 'all' || row.health === healthFilter)
    ))
    const orderedRows = sortRows(visibleRows, sorting)
    const productCountLabel = `${products.length} ${products.length === 1 ? 'product' : 'products'}`
    const activeFilterCount = Number(statusFilter !== 'all') + Number(healthFilter !== 'all')

    useEffect(() => {
        if (isLoading) return
        if (selectedProductId && orderedRows.some(row => row.id === selectedProductId)) return
        onSelect(orderedRows[0]?.id ?? null)
    }, [isLoading, onSelect, orderedRows, selectedProductId])

    return (
        <PortfolioCard
            title="Launched Products"
            emptyMessage="Launch a product to see it here."
            headerMeta={<span className="text-sm text-(--color-text-muted)">{productCountLabel}</span>}
            headerActions={(isLoading || products.length > 0) ? (
                <>
                    <label className="min-w-0 flex-1 sm:flex-none">
                        <span className="sr-only">Search products</span>
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={event => setSearchQuery(event.target.value)}
                            placeholder="Search products"
                            className="h-9 w-full min-w-0 rounded-md border border-(--color-border) bg-transparent px-3 text-sm text-(--color-text) outline-none placeholder:text-(--color-text-muted) focus:border-(--color-focus) sm:w-44"
                        />
                    </label>
                    <div className="relative shrink-0">
                        <button
                            type="button"
                            aria-expanded={filtersOpen}
                            aria-controls="portfolio-product-filters"
                            onClick={() => setFiltersOpen(open => !open)}
                            className="inline-flex h-9 items-center rounded-md border border-(--color-border) bg-transparent px-3 text-sm font-medium text-(--color-text) hover:bg-(--color-bg)"
                        >
                            Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
                        </button>
                        {filtersOpen && (
                            <div
                                id="portfolio-product-filters"
                                className="absolute right-0 z-20 mt-2 w-48 rounded-md border border-(--color-border) bg-(--color-card) p-2 shadow-lg"
                            >
                                <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-(--color-text-faint)">Status</p>
                                {statusFilters.map(filter => <button key={filter.value} type="button" aria-pressed={statusFilter === filter.value} onClick={() => setStatusFilter(filter.value)} className="block w-full rounded-sm px-2 py-1.5 text-left text-sm text-(--color-text) hover:bg-(--color-bg) aria-pressed:bg-(--color-blue-soft) aria-pressed:font-semibold">{filter.label}</button>)}
                                <div className="my-2 h-px bg-(--color-border)" />
                                <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-(--color-text-faint)">Health</p>
                                {healthFilters.map(filter => <button key={filter.value} type="button" aria-pressed={healthFilter === filter.value} onClick={() => setHealthFilter(filter.value)} className="block w-full rounded-sm px-2 py-1.5 text-left text-sm text-(--color-text) hover:bg-(--color-bg) aria-pressed:bg-(--color-blue-soft) aria-pressed:font-semibold">{filter.label}</button>)}
                            </div>
                        )}
                    </div>
                </>
            ) : undefined}
            className="min-h-64 md:col-span-2 xl:col-span-3 xl:col-start-1 xl:row-start-3"
        >
            {(isLoading || rows.length > 0) ? (
                <DataTable
                    columns={launchedProductColumns}
                    data={orderedRows}
                    emptyMessage="No products match your search and filters."
                    isLoading={isLoading}
                    getRowId={row => row.id}
                    selectedRowId={selectedProductId}
                    onRowClick={row => onSelect(row.id)}
                    sorting={sorting}
                    onSortingChange={setSorting}
                    surfaceClassName="bg-(--color-card)"
                    scrollClassName="min-h-0 flex-1 overflow-auto"
                    className="-mx-4 flex h-full min-h-0 w-[calc(100%+2rem)] flex-col border-0 [&_td]:whitespace-nowrap [&_thead]:bg-transparent"
                />
            ) : undefined}
        </PortfolioCard>
    )
}

export function LifecyclePanel({
    product,
    onUpdate,
    onRemove,
}: {
    product: PipelineCard | null
    onUpdate?: (product: PipelineCard) => void
    onRemove?: (id: string) => void
}) {
    const [saving, setSaving] = useState(false)
    const [confirmingRemove, setConfirmingRemove] = useState(false)
    const [actionError, setActionError] = useState<string | null>(null)

    if (!product) {
        return <PortfolioCard title="Lifecycle" emptyMessage="Select a launched product to view its lifecycle." className="min-h-64 md:col-span-2 xl:col-span-1 xl:col-start-4 xl:row-span-2 xl:row-start-3" />
    }

    const selectedProduct = product
    const status = launchedStatus(product)
    const actionClass = 'w-full rounded-md border border-(--color-border) px-3 py-2 text-left text-sm font-medium text-(--color-text) transition-colors hover:bg-(--color-bg) disabled:cursor-not-allowed disabled:opacity-50'

    async function changeStatus(nextStatus: PortfolioProductStatus) {
        setSaving(true)
        setActionError(null)
        try {
            const response = await fetch(`/api/pipeline/${product!.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus }),
            })
            const json = await response.json()
            if (!response.ok) throw new Error(json?.detail || json?.error || 'Could not update product')
            onUpdate?.(json?.data ?? { ...product!, status: nextStatus })
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Could not update product')
        } finally {
            setSaving(false)
        }
    }

    function updateIcon(event: ChangeEvent<HTMLInputElement>) {
        const input = event.currentTarget
        const file = input.files?.[0]
        input.value = ''
        if (!file) return
        const supportedTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
        if (!supportedTypes.has(file.type) || file.size > 300 * 1024) {
            setActionError('Use a PNG, JPG, WebP, or GIF under 300 KB.')
            return
        }

        const reader = new FileReader()
        reader.onerror = () => setActionError('Could not read that image.')
        reader.onload = () => {
            const iconUrl = typeof reader.result === 'string' ? reader.result : null
            if (!iconUrl) return
            void (async () => {
                setSaving(true)
                setActionError(null)
                try {
                    const response = await fetch(`/api/pipeline/${selectedProduct.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ icon_url: iconUrl }),
                    })
                    const json = await response.json()
                    if (!response.ok) throw new Error(json?.detail || json?.error || 'Could not update icon')
                    onUpdate?.(json?.data ?? { ...selectedProduct, iconUrl })
                } catch (error) {
                    setActionError(error instanceof Error ? error.message : 'Could not update icon')
                } finally {
                    setSaving(false)
                }
            })()
        }
        reader.readAsDataURL(file)
    }

    async function removeProduct() {
        setSaving(true)
        setActionError(null)
        try {
            const response = await fetch(`/api/pipeline/${product!.id}`, { method: 'DELETE' })
            if (!response.ok) throw new Error('Could not remove product from portfolio')
            onRemove?.(product!.id)
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Could not remove product from portfolio')
        } finally {
            setSaving(false)
        }
    }

    return (
        <PortfolioCard title="Lifecycle" emptyMessage="Select a launched product to view its lifecycle." className="min-h-64 md:col-span-2 xl:col-span-1 xl:col-start-4 xl:row-span-2 xl:row-start-3">
            <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain pr-1">
                <div className="flex min-w-0 items-start gap-3">
                    <ProductIcon name={product.displayName || product.name} iconUrl={product.iconUrl} size="md" />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-(--color-text)" title={product.displayName || product.name}>{product.displayName || product.name}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <StatusChip status={statusChip(status)} semantic />
                            <label className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-(--color-link) hover:text-(--color-link-hover)">
                                <ImagePlus aria-hidden size={13} />
                                Update icon
                                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={updateIcon} disabled={saving} className="sr-only" aria-label="Update product icon" />
                            </label>
                        </div>
                    </div>
                </div>
                <dl className="space-y-2 border-y border-(--color-border) py-3 text-sm">
                    <div className="flex items-center justify-between gap-3"><dt className="text-(--color-text-muted)">Launched</dt><dd className="text-right text-(--color-text)">{product.launchedAt ? new Date(product.launchedAt).toLocaleDateString() : 'Not recorded'}</dd></div>
                    <div className="flex items-center justify-between gap-3"><dt className="text-(--color-text-muted)">Time live</dt><dd className="text-right text-(--color-text)">{daysSinceLaunch(product.launchedAt)}</dd></div>
                    <div className="flex items-center justify-between gap-3"><dt className="text-(--color-text-muted)">Health</dt><dd><HealthChip health="no-data" semantic /></dd></div>
                </dl>
                <div className="flex flex-col gap-2">
                    <Link href={`${routes.core.monitorCommandCenter}?pipelineId=${product.id}`} className={actionClass}>Open in Monitor</Link>
                    {status === 'paused' ? (
                        <button type="button" disabled={saving} onClick={() => void changeStatus('active')} className={actionClass}>Resume project</button>
                    ) : status === 'active' ? (
                        <button type="button" disabled={saving} onClick={() => void changeStatus('paused')} className={actionClass}>Pause project</button>
                    ) : null}
                    {(status === 'sunsetting' || status === 'retired' || status === 'killed') && <button type="button" disabled={saving} onClick={() => void changeStatus('active')} className={actionClass}>Reopen product</button>}
                    <button type="button" disabled={saving} onClick={() => setConfirmingRemove(true)} className={`${actionClass} border-(--color-error) text-(--color-error)`}>Remove from portfolio</button>
                </div>
                {confirmingRemove && (
                    <div className="rounded-md border border-(--color-error) bg-(--color-error-soft) p-3">
                        <p className="text-sm text-(--color-text)">Remove this product from active Portfolio views?</p>
                        <div className="mt-3 flex justify-end gap-2">
                            <button type="button" disabled={saving} onClick={() => setConfirmingRemove(false)} className="rounded-md px-3 py-1.5 text-sm text-(--color-text)">Cancel</button>
                            <button type="button" disabled={saving} onClick={() => void removeProduct()} className="rounded-md bg-(--color-error) px-3 py-1.5 text-sm font-medium text-white">Remove</button>
                        </div>
                    </div>
                )}
                {actionError && <p role="alert" className="text-sm text-(--color-error)">{actionError}</p>}
            </div>
        </PortfolioCard>
    )
}

export function LaunchNewCard() {
    return <PortfolioCard title="Launch New" emptyMessage="Launch a product when you are ready." className="min-h-40 xl:col-start-1 xl:row-start-4" />
}

export function RecentInsightsCard() {
    return <PortfolioCard title="Recent Insights" emptyMessage="Insights will appear as product data arrives." className="min-h-40 md:col-span-2 xl:col-span-2 xl:col-start-2 xl:row-start-4" />
}

export default function PortfolioGrid({
    products = [],
    isLoadingProducts = false,
    overviewMetrics = null,
    isLoadingMetrics = false,
    attentionIssues = [],
    isLoadingIssues = false,
    selectedProductId: controlledSelectedProductId,
    onSelectedProductIdChange,
    onProductUpdate,
    onProductRemove,
}: PortfolioGridProps) {
    const [internalSelectedProductId, setInternalSelectedProductId] = useState<string | null>(null)
    const selectedProductId = controlledSelectedProductId === undefined ? internalSelectedProductId : controlledSelectedProductId
    const selectedProduct = products.find(product => product.id === selectedProductId) ?? null
    const metrics = new Map(overviewMetrics?.metrics?.map(metric => [metric.metric, metric]))

    function selectProduct(id: string | null) {
        setInternalSelectedProductId(id)
        onSelectedProductIdChange?.(id)
    }

    return (
        <div className="grid grid-cols-1 items-stretch gap-4 md:grid-flow-dense md:grid-cols-2 xl:min-h-[44rem] xl:flex-1 xl:grid-cols-4 xl:grid-rows-[9.5rem_minmax(9rem,1fr)_minmax(12rem,1.75fr)_minmax(9rem,1fr)]">
            <MetricCard metricName="traffic" metric={metrics.get('traffic')} isLoading={isLoadingMetrics} />
            <MetricCard metricName="usage" metric={metrics.get('usage')} isLoading={isLoadingMetrics} />
            <MetricCard metricName="revenue" metric={metrics.get('revenue')} isLoading={isLoadingMetrics} />
            <MetricCard metricName="errors" metric={metrics.get('errors')} isLoading={isLoadingMetrics} />

            <QuickReadCard overviewMetrics={overviewMetrics} products={products} attentionIssues={attentionIssues} />
            <MonitoringSetupCard selectedProductId={selectedProductId} selectedProductName={selectedProduct?.displayName ?? selectedProduct?.name ?? null} />
            <NeedAttentionCard issues={attentionIssues} isLoading={isLoadingIssues} />

            <LaunchedProductsCard products={products} selectedProductId={selectedProductId} onSelect={selectProduct} isLoading={isLoadingProducts} />
            <LifecyclePanel key={selectedProduct?.id ?? 'empty'} product={selectedProduct} onUpdate={onProductUpdate} onRemove={onProductRemove} />
            <LaunchNewCard />
            <RecentInsightsCard />
        </div>
    )
}

