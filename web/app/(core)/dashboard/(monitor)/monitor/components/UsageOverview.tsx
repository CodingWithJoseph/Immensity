import VerdictHeader, { type VerdictTone } from './VerdictHeader'
import { formatDateTime } from '@/lib/format'
import type { UsageMetrics } from '../types'

type Verdict = { eyebrow: string; verdict: string; tone: VerdictTone; hero?: { value: string; label: string; sub?: string } }

// Lead the Usage view with the growth story — the signup trend is the thing that
// actually moves the business, so it sets the tone.
export function usageVerdict(usage: UsageMetrics | null): Verdict {
    if (!usage) return { eyebrow: 'Usage', verdict: 'No usage captured yet.', tone: 'muted' }
    const s = usage.summary14d
    const signupChange = usage.growth?.signups.changePct ?? null
    const hero = { value: s.visitors.toLocaleString(), label: `${usage.windowDays}d visitors` }
    if (signupChange != null && signupChange < -0.1) {
        return { eyebrow: 'Usage', verdict: `Signups slipped ${Math.abs(Math.round(signupChange * 100))}% week-over-week — worth a look before it compounds.`, tone: 'neutral', hero }
    }
    if (signupChange != null && signupChange > 0.1) {
        return { eyebrow: 'Usage', verdict: `Growth is healthy — signups up ${Math.round(signupChange * 100)}% week-over-week.`, tone: 'good', hero }
    }
    return { eyebrow: 'Usage', verdict: `${s.visitors.toLocaleString()} visitors and ${s.signups.toLocaleString()} signups over the last ${usage.windowDays} days.`, tone: 'good', hero }
}


function formatPercent(value: number | null | undefined) {
    if (value == null) return '—'
    return `${Math.round(value * 100)}%`
}

function formatChange(value: number | null | undefined) {
    if (value == null) return 'No prior week'
    const pct = Math.round(value * 100)
    const sign = pct > 0 ? '+' : ''
    return `${sign}${pct}% vs last week`
}

function changeTone(value: number | null | undefined) {
    if (value == null || value === 0) return 'text-(--color-text-muted)'
    return value > 0 ? 'text-(--color-blue)' : 'text-(--color-error)'
}

function Metric({ label, value, change }: { label: string; value: number | string; change?: number | null }) {
    return (
        <div className="rounded-md bg-(--color-card) p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-(--color-text)">{value}</p>
            {change !== undefined && (
                <p className={`mt-1 text-xs font-medium ${changeTone(change)}`}>{formatChange(change)}</p>
            )}
        </div>
    )
}

function FunnelStage({ label, count, rate, isFirst }: { label: string; count: number; rate?: number | null; isFirst?: boolean }) {
    return (
        <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-(--color-text)">{count}</p>
            <p className="mt-1 text-xs text-(--color-text-muted)">{isFirst ? 'Top of funnel' : `${formatPercent(rate)} conversion`}</p>
        </div>
    )
}

function RollupTable({ title, cols, rows, empty }: {
    title: string
    cols: string[]
    rows: { key: string; label: string; a: number; b: number }[]
    empty: string
}) {
    return (
        <section className="rounded-md bg-(--color-card)">
            <div className="border-b border-(--color-border) px-5 py-4">
                <p className="text-sm font-semibold text-(--color-text)">{title}</p>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_80px_80px] gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">
                <span>{cols[0]}</span>
                <span className="text-right">{cols[1]}</span>
                <span className="text-right">{cols[2]}</span>
            </div>
            <div className="divide-y divide-(--color-border)">
                {rows.length ? rows.map(row => (
                    <div key={row.key} className="grid grid-cols-[minmax(0,1fr)_80px_80px] gap-2 px-5 py-3 text-sm">
                        <span className="truncate text-(--color-text)" title={row.label}>{row.label}</span>
                        <span className="text-right text-(--color-text-muted)">{row.a}</span>
                        <span className="text-right text-(--color-text-muted)">{row.b}</span>
                    </div>
                )) : (
                    <p className="px-5 py-4 text-sm text-(--color-text-muted)">{empty}</p>
                )}
            </div>
        </section>
    )
}

function formatCohortDate(value: string) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function UsageOverview({ usage }: { usage: UsageMetrics | null }) {
    const summary = usage?.summary14d
    const funnel = usage?.funnel
    const growth = usage?.growth
    const retention = usage?.retention
    const windowDays = usage?.windowDays ?? 14
    return (
        <section className="flex flex-col gap-6">
            <VerdictHeader {...usageVerdict(usage)} />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Metric label={`${windowDays}d visitors`} value={summary?.visitors ?? 0} change={growth?.visitors.changePct ?? null} />
                <Metric label={`${windowDays}d pageviews`} value={summary?.pageviews ?? 0} />
                <Metric label="Signups" value={summary?.signups ?? 0} change={growth?.signups.changePct ?? null} />
                <Metric label="Activations" value={summary?.activations ?? 0} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <RollupTable
                    title={`Top pages (${windowDays}d)`}
                    cols={['Page', 'Views', 'Visitors']}
                    rows={(usage?.topPages ?? []).map(page => ({ key: page.url, label: page.url, a: page.views, b: page.visitors }))}
                    empty="No pageviews yet."
                />
                <RollupTable
                    title={`Top events (${windowDays}d)`}
                    cols={['Event', 'Count', 'Visitors']}
                    rows={(usage?.topEvents ?? []).map(event => ({ key: event.name, label: event.name, a: event.count, b: event.visitors }))}
                    empty="No events yet."
                />
            </div>

            {funnel && (
                <section className="rounded-md bg-(--color-card)">
                    <div className="border-b border-(--color-border) px-5 py-4">
                        <p className="text-sm font-semibold text-(--color-text)">Conversion funnel ({windowDays}d)</p>
                    </div>
                    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
                        <FunnelStage label="Visited" count={funnel.visited} isFirst />
                        <FunnelStage label="Signed up" count={funnel.signedUp} rate={funnel.signupRate} />
                        <FunnelStage label="Activated" count={funnel.activated} rate={funnel.activationRate} />
                    </div>
                </section>
            )}

            {retention && (
                <section className="rounded-md bg-(--color-card)">
                    <div className="border-b border-(--color-border) px-5 py-4">
                        <p className="text-sm font-semibold text-(--color-text)">Retention</p>
                        <p className="mt-1 text-xs text-(--color-text-muted)">Do visitors come back? Measured over {retention.windowDays} days.</p>
                    </div>
                    <div className="grid gap-4 p-5 sm:grid-cols-2">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">Day 1 return</p>
                            <p className="mt-2 text-2xl font-semibold text-(--color-text)">{formatPercent(retention.d1.rate)}</p>
                            <p className="mt-1 text-xs text-(--color-text-muted)">{retention.d1.retained} of {retention.d1.eligible} visitors</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">Day 7 return</p>
                            <p className="mt-2 text-2xl font-semibold text-(--color-text)">{formatPercent(retention.d7.rate)}</p>
                            <p className="mt-1 text-xs text-(--color-text-muted)">{retention.d7.retained} of {retention.d7.eligible} visitors</p>
                        </div>
                    </div>
                    {retention.cohorts.length > 0 && (
                        <div className="border-t border-(--color-border)">
                            <div className="grid grid-cols-[minmax(0,1fr)_80px_80px_80px] gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">
                                <span>Cohort</span>
                                <span className="text-right">Size</span>
                                <span className="text-right">D1</span>
                                <span className="text-right">D7</span>
                            </div>
                            <div className="divide-y divide-(--color-border)">
                                {retention.cohorts.map(cohort => (
                                    <div key={cohort.date} className="grid grid-cols-[minmax(0,1fr)_80px_80px_80px] gap-2 px-5 py-3 text-sm">
                                        <span className="text-(--color-text)">{formatCohortDate(cohort.date)}</span>
                                        <span className="text-right text-(--color-text-muted)">{cohort.size}</span>
                                        <span className="text-right text-(--color-text-muted)">{formatPercent(cohort.d1Rate)}</span>
                                        <span className="text-right text-(--color-text-muted)">{formatPercent(cohort.d7Rate)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            )}

            <section className="rounded-md bg-(--color-card)">
                <div className="border-b border-(--color-border) px-5 py-4">
                    <p className="text-sm font-semibold text-(--color-text)">Recent events</p>
                    <p className="mt-1 text-xs text-(--color-text-muted)">Raw log — the rollups above are the headline.</p>
                </div>
                <div className="divide-y divide-(--color-border)">
                    {usage?.recentEvents.length ? usage.recentEvents.map(event => (
                        <div key={event.id} className="grid gap-2 p-5 text-sm md:grid-cols-[140px_minmax(0,1fr)_140px]">
                            <span className="font-medium text-(--color-text)">{event.eventType}</span>
                            <span className="truncate text-(--color-text-muted)">{event.url || 'No URL'}</span>
                            <span className="text-(--color-text-muted)">{formatDateTime(event.occurredAt, 'Not yet')}</span>
                        </div>
                    )) : (
                        <p className="p-5 text-sm text-(--color-text-muted)">Waiting for the first event.</p>
                    )}
                </div>
            </section>
        </section>
    )
}
