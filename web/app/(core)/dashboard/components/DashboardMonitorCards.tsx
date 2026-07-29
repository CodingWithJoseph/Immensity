'use client'

import Link from 'next/link'
import DashboardEmptyState from '@/app/(core)/dashboard/components/DashboardEmptyState'
import ProgressBar from '@/app/(core)/dashboard/components/ProgressBar'
import type {
    CommandCenterData,
    HealthState,
    UsageMetrics,
} from '@/app/(core)/dashboard/(monitor)/monitor/types'
import { fetchJson, ApiData } from '@/lib/fetchJson'
import type { PipelineCard } from '@/lib/types/cluster'
import { routes } from '@/app/util/routes'
import FeatureContextDot from '@/app/(core)/dashboard/components/FeatureContextDot'


type MonitorSnapshot = {
    usage: UsageMetrics | null
    command: CommandCenterData | null
}

export interface DashboardHealthProduct {
    id: string
    name: string
    state: HealthState
    label: string
    reason: string
}

export interface DashboardMonitorSummary {
    totalProducts: number
    reportingProducts: number
    revenueConnectedProducts: number
    revenueCents: number | null
    revenueChangePct: number | null
    activeUsers: number
    activeUserRate: number | null
    activeUsersChangePct: number | null
    newUsers: number
    newUserRate: number | null
    newUsersChangePct: number | null
    activations: number
    activationRate: number | null
    healthyProducts: number
    attentionProducts: number
    unmonitoredProducts: number
    healthProducts: DashboardHealthProduct[]
}

const HEALTHY_STATES = new Set<HealthState>(['live', 'healthy'])
const ATTENTION_STATES = new Set<HealthState>(['stale', 'silent', 'noisy', 'failing', 'warning', 'unhealthy'])
const CRITICAL_HEALTH_STATES = new Set<HealthState>(['failing', 'unhealthy'])
const HEALTH_PRIORITY: Partial<Record<HealthState, number>> = {
    failing: 0,
    unhealthy: 1,
    silent: 2,
    warning: 3,
    stale: 4,
    noisy: 5,
    live: 10,
    healthy: 10,
}

function changePct(current: number, previous: number): number | null {
    if (previous <= 0) return null
    return (current - previous) / previous
}

export function summarizeMonitorSnapshots(
    products: PipelineCard[],
    snapshots: MonitorSnapshot[],
): DashboardMonitorSummary {
    let visitors = 0
    let activeUsers = 0
    let newUsers = 0
    let activations = 0
    let visitorsCurrent = 0
    let visitorsPrevious = 0
    let signupsCurrent = 0
    let signupsPrevious = 0
    let revenueCurrent = 0
    let revenuePrevious = 0
    let revenueConnectedProducts = 0
    let reportingProducts = 0
    let healthyProducts = 0
    let attentionProducts = 0
    let unmonitoredProducts = 0
    const healthProducts: DashboardHealthProduct[] = []

    snapshots.forEach(({ usage, command }, index) => {
        if (usage?.connected) {
            reportingProducts += 1
            visitors += usage.summary14d.visitors
            activeUsers += usage.summary14d.activeUsers
            newUsers += usage.summary14d.signups
            activations += usage.summary14d.activations
        }

        if (command?.revenueConnected && command.trends.revenue.current != null) {
            revenueConnectedProducts += 1
            revenueCurrent += command.trends.revenue.current
            revenuePrevious += command.trends.revenue.previous ?? 0
        }

        if (!command || command.health.state === 'no-data') {
            unmonitoredProducts += 1
            return
        }

        visitorsCurrent += command.trends.visitors.current
        visitorsPrevious += command.trends.visitors.previous
        signupsCurrent += command.trends.signups.current
        signupsPrevious += command.trends.signups.previous

        if (HEALTHY_STATES.has(command.health.state)) {
            healthyProducts += 1
            const product = products[index]
            if (product) {
                healthProducts.push({
                    id: product.id,
                    name: product.displayName ?? product.name,
                    state: command.health.state,
                    label: command.health.label,
                    reason: command.health.reason,
                })
            }
        } else if (ATTENTION_STATES.has(command.health.state)) {
            attentionProducts += 1
            const product = products[index]
            if (product) {
                healthProducts.push({
                    id: product.id,
                    name: product.displayName ?? product.name,
                    state: command.health.state,
                    label: command.health.label,
                    reason: command.health.reason,
                })
            }
        } else {
            unmonitoredProducts += 1
        }
    })

    const visibleHealthProducts = healthProducts
        .sort((a, b) => (HEALTH_PRIORITY[a.state] ?? 99) - (HEALTH_PRIORITY[b.state] ?? 99))
        .slice(0, 3)

    return {
        totalProducts: products.length,
        reportingProducts,
        revenueConnectedProducts,
        revenueCents: revenueConnectedProducts > 0 ? revenueCurrent : null,
        revenueChangePct: revenueConnectedProducts > 0 ? changePct(revenueCurrent, revenuePrevious) : null,
        activeUsers,
        activeUserRate: visitors > 0 ? activeUsers / visitors : null,
        activeUsersChangePct: changePct(visitorsCurrent, visitorsPrevious),
        newUsers,
        newUserRate: visitors > 0 ? newUsers / visitors : null,
        newUsersChangePct: changePct(signupsCurrent, signupsPrevious),
        activations,
        activationRate: newUsers > 0 ? activations / newUsers : null,
        healthyProducts,
        attentionProducts,
        unmonitoredProducts,
        healthProducts: visibleHealthProducts,
    }
}

export async function loadDashboardMonitorSummary(headers: HeadersInit): Promise<DashboardMonitorSummary | null> {
    const portfolioJson = await fetchJson<ApiData<PipelineCard[]>>('/api/portfolio', { headers })
    if (!portfolioJson) return null

    const products = (portfolioJson.data ?? []).filter(product => !product.removedAt)
    const snapshots = await Promise.all(products.map(async product => {
        const [usageJson, commandJson] = await Promise.all([
            fetchJson<ApiData<UsageMetrics>>(`/api/monitor/${product.id}/usage`, { headers }),
            fetchJson<ApiData<CommandCenterData>>(`/api/monitor/${product.id}/command-center`, { headers }),
        ])
        return {
            usage: usageJson?.data ?? null,
            command: commandJson?.data ?? null,
        }
    }))

    return summarizeMonitorSnapshots(products, snapshots)
}

function formatMoney(cents: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100)
}

function formatPercent(value: number | null): string {
    if (value == null) return '-'
    return `${Math.round(value * 100)}%`
}

function Trend({ value }: { value: number | null }) {
    const tone = value == null || value === 0
        ? 'text-(--color-text-muted)'
        : value > 0
            ? 'text-(--color-blue)'
            : 'text-(--color-error)'
    const label = value == null
        ? 'No prior period'
        : `${value > 0 ? '+' : ''}${Math.round(value * 100)}% vs prior`

    return <span className={`text-[11px] font-medium ${tone}`}>{label}</span>
}

function CardShell({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className='flex h-full min-h-0 flex-col gap-2'>
            <div className='flex items-center gap-2 px-1'>
                <FeatureContextDot category='monitor' />
                <h2 className='text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)'>{title}</h2>
            </div>
            {children}
        </section>
    )
}

function CardBody({ children }: { children: React.ReactNode }) {
    return (
        <div className='flex min-h-0 flex-1 flex-col justify-center rounded-md border border-(--color-border) bg-(--color-surface-raised) p-4 shadow-[var(--shadow-sm)]'>
            {children}
        </div>
    )
}

function MonitorUnavailable({ children }: { children: React.ReactNode }) {
    return <DashboardEmptyState>{children}</DashboardEmptyState>
}

export function DashboardRevenueCard({ summary, loading }: { summary: DashboardMonitorSummary | null; loading: boolean }) {
    return (
        <CardShell title='Revenue'>
            {loading ? (
                <div className='min-h-0 flex-1 animate-pulse rounded-md border border-(--color-border) bg-(--color-surface-tint)' />
            ) : summary?.revenueCents == null ? (
                <MonitorUnavailable>Connect revenue tracking to see workspace revenue.</MonitorUnavailable>
            ) : (
                <CardBody>
                    <p className='text-2xl font-semibold text-(--color-text)'>{formatMoney(summary.revenueCents)}</p>
                    <div className='mt-2 flex flex-wrap items-center justify-between gap-2'>
                        <span className='text-[11px] text-(--color-text-muted)'>Current MRR</span>
                        <Trend value={summary.revenueChangePct} />
                    </div>
                    <p className='mt-3 text-[11px] text-(--color-text-faint)'>Across {summary.revenueConnectedProducts} connected product{summary.revenueConnectedProducts === 1 ? '' : 's'}</p>
                </CardBody>
            )}
        </CardShell>
    )
}

function AudienceMetric({ label, rate, count, trend }: { label: string; rate: number | null; count: number; trend: number | null }) {
    return (
        <div className='flex min-w-0 flex-1 flex-col justify-between gap-2 px-3 first:pl-0 last:pr-0'>
            <span className='text-[10px] font-semibold uppercase tracking-widest text-(--color-text-muted)'>{label}</span>
            <span className='text-xl font-semibold text-(--color-text)'>{formatPercent(rate)}</span>
            <span className='text-[10px] text-(--color-text-faint)'>{count.toLocaleString()} users</span>
            <Trend value={trend} />
        </div>
    )
}

export function DashboardActiveUsersCard({ summary, loading }: { summary: DashboardMonitorSummary | null; loading: boolean }) {
    const hasUserActivity = Boolean(summary && (summary.activeUsers > 0 || summary.newUsers > 0))

    return (
        <CardShell title='Active users'>
            {loading ? (
                <div className='min-h-0 flex-1 animate-pulse rounded-md border border-(--color-border) bg-(--color-surface-tint)' />
            ) : !summary || summary.reportingProducts === 0 || !hasUserActivity ? (
                <MonitorUnavailable>
                    {summary?.reportingProducts ? 'No workspace user activity yet.' : 'Connect usage tracking to see workspace users.'}
                </MonitorUnavailable>
            ) : (
                <CardBody>
                    <div className='grid grid-cols-2 divide-x divide-(--color-border)'>
                        <AudienceMetric label='Active' rate={summary.activeUserRate} count={summary.activeUsers} trend={summary.activeUsersChangePct} />
                        <AudienceMetric label='New' rate={summary.newUserRate} count={summary.newUsers} trend={summary.newUsersChangePct} />
                    </div>
                </CardBody>
            )}
        </CardShell>
    )
}

export function DashboardActivationRateCard({ summary, loading }: { summary: DashboardMonitorSummary | null; loading: boolean }) {
    return (
        <CardShell title='Activation rate'>
            {loading ? (
                <div className='min-h-0 flex-1 animate-pulse rounded-md border border-(--color-border) bg-(--color-surface-tint)' />
            ) : !summary || summary.reportingProducts === 0 || summary.newUsers === 0 ? (
                <MonitorUnavailable>
                    {summary?.reportingProducts ? 'No new users available to measure activation yet.' : 'Connect usage tracking to measure activation.'}
                </MonitorUnavailable>
            ) : (
                <CardBody>
                    <p className='text-2xl font-semibold text-(--color-text)'>{formatPercent(summary.activationRate)}</p>
                    <p className='mt-2 text-[11px] text-(--color-text-muted)'>
                        {summary.activations.toLocaleString()} of {summary.newUsers.toLocaleString()} new users activated
                    </p>
                    <ProgressBar value={summary.activationRate ?? 0} max={1} size='sm' className='mt-4' />
                </CardBody>
            )}
        </CardShell>
    )
}

export function DashboardProductHealthCard({ summary, loading }: { summary: DashboardMonitorSummary | null; loading: boolean }) {
    const healthProducts = summary?.healthProducts?.slice(0, 3) ?? []

    return (
        <CardShell title='Product health'>
            {loading ? (
                <div className='min-h-0 flex-1 animate-pulse rounded-md border border-(--color-border) bg-(--color-surface-tint)' />
            ) : !summary || summary.totalProducts === 0 ? (
                <MonitorUnavailable>Launch a product to begin monitoring its health.</MonitorUnavailable>
            ) : healthProducts.length > 0 ? (
                <div className='flex min-h-0 flex-1 flex-col rounded-md border border-(--color-border) bg-(--color-surface-raised) px-4 shadow-[var(--shadow-sm)]'>
                    <div className='flex min-h-0 flex-1 flex-col divide-y divide-(--color-border)'>
                        {healthProducts.map(product => {
                            const healthy = HEALTHY_STATES.has(product.state)
                            const critical = CRITICAL_HEALTH_STATES.has(product.state)
                            const dotTone = healthy
                                ? 'bg-(--color-blue)'
                                : critical
                                    ? 'bg-(--color-error)'
                                    : 'bg-(--color-warning)'
                            const textTone = healthy
                                ? 'text-(--color-blue)'
                                : critical
                                    ? 'text-(--color-error)'
                                    : 'text-(--color-warning)'
                            return (
                                <Link
                                    key={product.id}
                                    href={`${routes.core.monitorCommandCenter}?pipelineId=${product.id}`}
                                    className='flex min-h-0 flex-1 items-center gap-3 py-2 transition-colors hover:bg-(--color-bg)'
                                >
                                    <span className={`h-2 w-2 shrink-0 rounded-full ${dotTone}`} />
                                    <span className='min-w-0 flex-1'>
                                        <span className='flex items-center justify-between gap-2'>
                                            <span className='truncate text-xs font-semibold text-(--color-text)'>{product.name}</span>
                                            <span className={`shrink-0 text-[10px] uppercase tracking-wide ${textTone}`}>{product.label || product.state}</span>
                                        </span>
                                        <span className='block truncate text-[10px] text-(--color-text-muted)'>{product.reason}</span>
                                    </span>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            ) : (
                <MonitorUnavailable>No product health data is available yet.</MonitorUnavailable>
            )}
        </CardShell>
    )
}
