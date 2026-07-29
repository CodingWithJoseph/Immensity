'use client'

import Link from 'next/link'
import { routes } from '@/app/util/routes'
import Chip from '@/app/(core)/dashboard/components/Chip'
import {
    goalCounts, overallPercent, buildTimelineOutlook, formatGoalDate, daysLeftLabel,
    type ScopedGoal,
} from '@/lib/goalsView'

function RailCard({ children }: { children: React.ReactNode }) {
    return <div className="rounded-md border border-(--color-border) bg-(--color-card) p-4">{children}</div>
}

function LegendRow({ dotClass, label, value }: { dotClass: string; label: string; value: number }) {
    return (
        <div className="flex items-center gap-2 text-xs">
            <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
            <span className="flex-1 text-(--color-text-muted)">{label}</span>
            <span className="font-medium tabular-nums text-(--color-text)">{value}</span>
        </div>
    )
}

// Donut showing overall completion, with completed/active/upcoming segments.
function ProgressDonut({ completed, active, upcoming, total, percent }: {
    completed: number; active: number; upcoming: number; total: number; percent: number
}) {
    const radius = 54
    const circumference = 2 * Math.PI * radius
    const safeTotal = total > 0 ? total : 1
    const segments = [
        { value: completed, color: 'var(--color-success)' },
        { value: active, color: 'var(--color-accent)' },
        { value: upcoming, color: 'var(--color-blue)' },
    ]
    let offset = 0
    return (
        <svg viewBox="0 0 140 140" className="h-32 w-32 shrink-0 -rotate-90" role="img" aria-label={`${percent}% of goals complete`}>
            <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--color-surface-tint)" strokeWidth="12" />
            {segments.map((seg, i) => {
                const len = (seg.value / safeTotal) * circumference
                const dash = <circle key={i} cx="70" cy="70" r={radius} fill="none" stroke={seg.color} strokeWidth="12"
                    strokeDasharray={`${len} ${circumference - len}`} strokeDashoffset={-offset} strokeLinecap="butt" />
                offset += len
                return dash
            })}
        </svg>
    )
}

export function GoalProgressOverview({ scoped }: { scoped: ScopedGoal[] }) {
    const counts = goalCounts(scoped)
    const percent = overallPercent(counts)
    return (
        <RailCard>
            <h2 className="mb-3 text-sm font-semibold text-(--color-text)">Goal Progress Overview</h2>
            <div className="flex items-center gap-4">
                <div className="relative grid place-items-center">
                    <ProgressDonut completed={counts.completed} active={counts.active} upcoming={counts.upcoming} total={counts.total} percent={percent} />
                    <div className="absolute grid place-items-center text-center">
                        <span className="text-xl font-semibold tabular-nums text-(--color-text)">{percent}%</span>
                        <span className="text-[10px] text-(--color-text-muted)">Overall</span>
                    </div>
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                    <LegendRow dotClass="bg-(--color-success)" label="Completed" value={counts.completed} />
                    <LegendRow dotClass="bg-(--color-accent)" label="Active" value={counts.active} />
                    <LegendRow dotClass="bg-(--color-blue)" label="Upcoming" value={counts.upcoming} />
                    <div className="mt-1 flex items-center justify-between border-t border-(--color-border) pt-1.5 text-xs">
                        <span className="text-(--color-text-muted)">Total milestones</span>
                        <span className="font-semibold tabular-nums text-(--color-text)">{counts.total}</span>
                    </div>
                </div>
            </div>
        </RailCard>
    )
}

export function TimelineOutlook({ scoped }: { scoped: ScopedGoal[] }) {
    const entries = buildTimelineOutlook(scoped)
    return (
        <RailCard>
            <h2 className="text-sm font-semibold text-(--color-text)">Timeline Outlook</h2>
            <p className="mt-0.5 mb-3 text-xs text-(--color-text-muted)">A high-level view of key milestones ahead.</p>
            {entries.length === 0 ? (
                <p className="text-xs text-(--color-text-muted)">No dated milestones yet.</p>
            ) : (
                <ol className="flex flex-col gap-3">
                    {entries.map(entry => {
                        const countdown = daysLeftLabel(entry.daysLeft)
                        return (
                            <li key={entry.key} className="flex items-start gap-3 text-xs">
                                <span className="mt-1 flex shrink-0 flex-col items-center">
                                    <span className={`h-2 w-2 rounded-full ${entry.kind === 'active' ? 'bg-(--color-accent)' : 'bg-(--color-blue)'}`} />
                                </span>
                                <span className="w-16 shrink-0 pt-0.5 text-(--color-text-muted)">{formatGoalDate(entry.date)}</span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate font-medium text-(--color-text)">{entry.name} · {entry.label}</span>
                                    <span className="text-(--color-text-faint)">{entry.kind === 'active' ? 'Target' : 'Est. start'}</span>
                                </span>
                                {entry.kind === 'active'
                                    ? countdown && <Chip label={countdown} tone="warning" />
                                    : <Chip label="Upcoming" tone="info" />}
                            </li>
                        )
                    })}
                </ol>
            )}
            <Link href={routes.core.calendar} className="mt-3 inline-flex items-center text-xs font-semibold text-(--color-link) hover:text-(--color-link-hover)">
                View full timeline
            </Link>
        </RailCard>
    )
}
