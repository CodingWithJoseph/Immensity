'use client'
import { DashboardActivity } from '@/lib/types/dashboard'
import DashboardEmptyState from '@/app/(core)/dashboard/components/DashboardEmptyState'
import FeatureContextDot from '@/app/(core)/dashboard/components/FeatureContextDot'

// GitHub-style heatmap of authenticated logins and successful workspace work.

function isoUtc(d: Date): string {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function relativeTime(value: string | null): string {
    if (!value) return '—'
    const then = new Date(value)
    if (Number.isNaN(then.getTime())) return '—'
    const mins = Math.round((Date.now() - then.getTime()) / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.round(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.round(hrs / 24)
    if (days < 30) return `${days}d ago`
    return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function cellColor(level: number): string {
    if (level <= 0) return 'var(--color-surface-tint)'
    return `rgba(255, 112, 8, ${0.2 + level * 0.2})` // accent ramp, 4 steps
}

function ActivityHeader({ children }: { children: React.ReactNode }) {
    return (
        <div className='flex items-center gap-2'>
            <FeatureContextDot category='monitor' />
            <h3 className='text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)'>{children}</h3>
        </div>
    )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'up' | 'down' | 'flat' }) {
    const toneColor = tone === 'up' ? 'text-(--color-blue)' : tone === 'down' ? 'text-(--color-error)' : 'text-(--color-text)'
    return (
        <div className='flex flex-col gap-1 rounded-md border border-(--color-border) bg-(--color-surface-raised) p-3'>
            <span className='text-[10px] font-semibold uppercase tracking-widest text-(--color-text-muted)'>{label}</span>
            <span className={`text-lg font-semibold tracking-[-0.01em] ${toneColor}`}>{value}</span>
            {sub && <span className='text-[11px] text-(--color-text-muted)'>{sub}</span>}
        </div>
    )
}

export default function DiscoveryActivityCard({ activity, loading }: { activity: DashboardActivity | null; loading: boolean }) {
    if (loading) {
        return (
            <section className='flex h-full min-h-0 flex-col gap-2'>
                <ActivityHeader>Workspace activity</ActivityHeader>
                <div className='min-h-0 flex-1 animate-pulse rounded-md border border-(--color-border) bg-(--color-surface-tint)' />
            </section>
        )
    }
    if (!activity || activity.days.length === 0) {
        return (
            <section className='flex h-full min-h-0 flex-col gap-2'>
                <ActivityHeader>Workspace activity</ActivityHeader>
                <DashboardEmptyState>No workspace activity recorded yet.</DashboardEmptyState>
            </section>
        )
    }

    const dayMap = new Map(activity.days.map(d => [d.date, d.count]))
    const max = Math.max(1, ...activity.days.map(d => d.count))

    // Build week-columns (Sun→Sat) from the aligned start through today.
    const end = new Date()
    end.setUTCHours(0, 0, 0, 0)
    const start = new Date(end)
    start.setUTCDate(end.getUTCDate() - (activity.weeks * 7 - 1))
    start.setUTCDate(start.getUTCDate() - start.getUTCDay()) // back to Sunday

    const columns: { iso: string; count: number; level: number; future: boolean; month: number }[][] = []
    const cursor = new Date(start)
    while (cursor <= end) {
        const col: { iso: string; count: number; level: number; future: boolean; month: number }[] = []
        for (let i = 0; i < 7; i++) {
            const iso = isoUtc(cursor)
            const count = dayMap.get(iso) ?? 0
            col.push({
                iso,
                count,
                level: count === 0 ? 0 : Math.min(4, Math.ceil((count / max) * 4)),
                future: cursor > end,
                month: cursor.getUTCMonth(),
            })
            cursor.setUTCDate(cursor.getUTCDate() + 1)
        }
        columns.push(col)
    }

    return (
        <section className='flex h-full min-h-0 flex-col gap-2'>
            <div className='flex flex-wrap items-center justify-between gap-2 pl-1 pr-3'>
                <ActivityHeader>Workspace activity</ActivityHeader>
                <span className='text-[11px] text-(--color-text-muted)'>
                    {activity.windowActions.toLocaleString()} action{activity.windowActions === 1 ? '' : 's'} · {activity.windowLogins.toLocaleString()} login{activity.windowLogins === 1 ? '' : 's'} · last {activity.weeks} weeks
                </span>
            </div>

            <div className='flex min-h-0 flex-1 flex-col rounded-md border border-(--color-border) bg-(--color-surface-raised) p-5 shadow-(--shadow-sm)'>
                <div className='flex min-h-0 flex-1 flex-col'>
                    <div className='flex min-h-0 flex-1 flex-col gap-2'>
                        {/* month labels */}
                        <div
                            className='grid gap-0.75'
                            style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
                        >
                            {columns.map((col, i) => {
                                const firstOfMonth = col[0] && (i === 0 || columns[i - 1][0].month !== col[0].month)
                                return (
                                    <div key={`m-${i}`} className='min-w-0 whitespace-nowrap text-[9px] leading-none text-(--color-text-faint)'>
                                        {firstOfMonth ? MONTHS[col[0].month] : ''}
                                    </div>
                                )
                            })}
                        </div>
                        {/* 7 rows × week columns */}
                        <div
                            className='grid min-h-0 flex-1 gap-0.75'
                            style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
                        >
                            {columns.map((col, ci) => (
                                <div key={ci} className='grid min-h-0 grid-rows-7 gap-0.75'>
                                    {col.map((cell, ri) => (
                                        <div
                                            key={ri}
                                            title={cell.future ? '' : `${cell.count} activity point${cell.count === 1 ? '' : 's'} · ${cell.iso}`}
                                            className='min-h-0 min-w-0 rounded-xs'
                                            style={{
                                                backgroundColor: cell.future ? 'transparent' : cellColor(cell.level),
                                                border: cell.future ? 'none' : '1px solid rgba(28,28,28,0.04)',
                                            }}
                                            aria-hidden
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                        {/* legend */}
                        <div className='mt-1 flex items-center gap-1.5 text-[10px] text-(--color-text-muted)'>
                            <span>Less</span>
                            {[0, 1, 2, 3, 4].map(l => (
                                <span key={l} className='h-2.75 w-2.75 rounded-xs' style={{ backgroundColor: cellColor(l) }} aria-hidden />
                            ))}
                            <span>More</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export function DiscoveryMetricsCard({ activity, loading }: { activity: DashboardActivity | null; loading: boolean }) {
    if (loading) {
        return (
            <section className='flex h-full min-h-0 flex-col gap-2'>
                <ActivityHeader>Activity metrics</ActivityHeader>
                <div className='grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-3'>
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className='animate-pulse rounded-md border border-(--color-border) bg-(--color-surface-tint)' />
                    ))}
                </div>
            </section>
        )
    }
    if (!activity || activity.days.length === 0) {
        return (
            <section className='flex h-full min-h-0 flex-col gap-2'>
                <ActivityHeader>Activity metrics</ActivityHeader>
                <DashboardEmptyState>No workspace activity recorded yet.</DashboardEmptyState>
            </section>
        )
    }

    const trend = activity.trend
    const tone: 'up' | 'down' | 'flat' = trend.changePct == null ? 'flat' : trend.changePct > 0 ? 'up' : trend.changePct < 0 ? 'down' : 'flat'
    const trendLabel = trend.changePct == null ? 'no prior week' : `${trend.changePct > 0 ? '+' : ''}${Math.round(trend.changePct * 100)}% vs prior 7d`

    return (
        <section className='flex h-full min-h-0 flex-col gap-2'>
            <ActivityHeader>Activity metrics</ActivityHeader>
            <div className='grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-3'>
                <Stat label='Activity (7d)' value={trend.current7d.toLocaleString()} sub={trendLabel} tone={tone} />
                <Stat label='Last active' value={relativeTime(activity.lastActivityAt)} />
                <Stat label={`Logins (${activity.weeks}w)`} value={activity.windowLogins.toLocaleString()} />
                <Stat label={`Active days (${activity.weeks}w)`} value={activity.activeDays.toLocaleString()} />
            </div>
        </section>
    )
}
