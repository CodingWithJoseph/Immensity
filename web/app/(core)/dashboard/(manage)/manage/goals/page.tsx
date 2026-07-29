'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useWorkspace } from '@/app/(core)/dashboard/contexts/WorkspaceContext'
import { fetchJson, ApiData } from '@/lib/fetchJson'
import { routes } from '@/app/util/routes'
import ProgressBar from '@/app/(core)/dashboard/components/ProgressBar'
import Chip from '@/app/(core)/dashboard/components/Chip'
import type { PipelineCard } from '@/lib/types/cluster'
import type { Goal } from '@/lib/types/goals'
import {
    scopeGoals, goalCounts, activeGoals, archivedGoals, buildUpcomingRows, buildCompletedRows,
    goalDisplayName, formatGoalValue, formatGoalDate, daysLeftLabel, goalPercent, goalTargetPhrase,
    type ScopedGoal, type GoalCounts,
} from '@/lib/goalsView'
import { GoalProgressOverview, TimelineOutlook } from './GoalsRail'
import { GettingStartedCard } from '@/app/(core)/dashboard/components/GettingStarted'
import { ScopeBadge } from '@/app/(core)/dashboard/components/ScopeBadge'


function SectionHeading({ title, description }: { title: string; description: string }) {
    return (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
                <h2 className="text-sm font-semibold text-(--color-text)">{title}</h2>
                <p className="mt-0.5 text-xs text-(--color-text-muted)">{description}</p>
            </div>
            <Link href={routes.core.calendar} className="shrink-0 text-xs font-semibold text-(--color-link) hover:text-(--color-link-hover)">
                View milestone dates on the calendar
            </Link>
        </div>
    )
}

type GoalTab = 'active' | 'upcoming' | 'completed' | 'archived'

// Underline tabs (with count badges) that select which goal section shows below.
function GoalTabs({ tab, onChange, counts }: { tab: GoalTab; onChange: (tab: GoalTab) => void; counts: GoalCounts }) {
    const items: { key: GoalTab; label: string; count: number }[] = [
        { key: 'active', label: 'Active', count: counts.active },
        { key: 'upcoming', label: 'Upcoming', count: counts.upcoming },
        { key: 'completed', label: 'Completed', count: counts.completed },
        { key: 'archived', label: 'Archived', count: counts.archived },
    ]
    return (
        <div role="tablist" aria-label="Goal states" className="flex border-b border-(--color-border)">
            {items.map(item => {
                const selected = tab === item.key
                return (
                    <button
                        key={item.key}
                        type="button"
                        role="tab"
                        id={`goals-tab-${item.key}`}
                        aria-selected={selected}
                        aria-controls={`goals-panel-${item.key}`}
                        onClick={() => onChange(item.key)}
                        className={`-mb-px flex flex-1 items-center justify-center gap-2 border-b-2 px-1 py-2.5 text-sm font-medium transition-colors ${selected ? 'border-(--color-accent) text-(--color-text)' : 'border-transparent text-(--color-text-muted) hover:text-(--color-text)'}`}
                    >
                        {item.label}
                        <span className={`rounded-full px-1.5 text-xs tabular-nums ${selected ? 'bg-(--color-accent-soft) text-(--color-accent)' : 'bg-(--color-surface-tint) text-(--color-text-muted)'}`}>{item.count}</span>
                    </button>
                )
            })}
        </div>
    )
}

function ActiveGoalCard({ scoped }: { scoped: ScopedGoal }) {
    const { goal, scopeLabel } = scoped
    const active = goal.activeTier!
    const percent = goalPercent(goal)
    const over = goal.currentValue >= active.threshold
    const countdown = daysLeftLabel(active.daysLeft)
    return (
        <div className="rounded-md border border-(--color-border) bg-(--color-card) p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-(--color-text)">{goalDisplayName(goal)}</h3>
                        <ScopeBadge scope={scoped.scope} name={scoped.scope === 'project' ? scopeLabel : undefined} />
                        <Chip label={goal.title} tone="info" />
                    </div>
                    <p className="mt-1 text-xs text-(--color-text-muted)">{goalTargetPhrase(goal.metricKey, active.threshold, active.label)} to complete this milestone.</p>
                </div>
                <div className="flex shrink-0 gap-6 text-xs">
                    <div>
                        <p className="text-(--color-text-muted)">Activated</p>
                        <p className="font-medium text-(--color-text)">{formatGoalDate(active.activatedAt)}</p>
                    </div>
                    <div>
                        <p className="text-(--color-text-muted)">Target</p>
                        <p className="font-medium text-(--color-text)">{formatGoalDate(active.targetDate)}</p>
                        {countdown && <p className={over ? 'text-(--color-error)' : 'text-(--color-text-muted)'}>{countdown}</p>}
                    </div>
                </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
                <span className="shrink-0 text-xs font-medium tabular-nums text-(--color-text)">
                    {formatGoalValue(goal.metricKey, goal.currentValue)} / {formatGoalValue(goal.metricKey, active.threshold)}
                </span>
                <ProgressBar value={goal.currentValue} max={active.threshold} size="sm" tone={over ? 'success' : 'process'} className="min-w-0 flex-1" />
                <span className="shrink-0 text-xs font-medium tabular-nums text-(--color-text-muted)">{percent}%</span>
            </div>
        </div>
    )
}

export default function GoalsPage() {
    const { selectedPipelineId, hydrated } = useWorkspace()
    const pipelineId = hydrated ? selectedPipelineId : null
    const [goals, setGoals] = useState<Goal[]>([])
    const [projectName, setProjectName] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<GoalTab>('active')

    // Scope follows the top-bar workspace selector: a project → its goals; Account
    // (no project) → the portfolio's account goals. One or the other, not both.
    useEffect(() => {
        if (!hydrated) return
        let active = true
        const run = async () => {
            setLoading(true)
            try {
                if (pipelineId) {
                    const [g, card] = await Promise.all([
                        fetchJson<ApiData<Goal[]>>(`/api/portfolio/${pipelineId}/goals`).then(j => j?.data ?? []).catch(() => []),
                        fetchJson<ApiData<PipelineCard>>(`/api/pipeline/${pipelineId}`).then(j => j?.data ?? null).catch(() => null),
                    ])
                    if (!active) return
                    setGoals(Array.isArray(g) ? g : [])
                    setProjectName(card ? (card.displayName ?? card.name) : 'This project')
                } else {
                    const g = await fetchJson<ApiData<Goal[]>>('/api/portfolio/goals').then(j => j?.data ?? []).catch(() => [])
                    if (!active) return
                    setGoals(Array.isArray(g) ? g : [])
                    setProjectName(null)
                }
            } finally {
                if (active) setLoading(false)
            }
        }
        void run()
        return () => { active = false }
    }, [pipelineId, hydrated])

    const scoped = useMemo<ScopedGoal[]>(() => (
        pipelineId
            ? scopeGoals(goals, 'project', projectName ?? 'This project')
            : scopeGoals(goals, 'account', 'Portfolio')
    ), [goals, pipelineId, projectName])

    const counts = useMemo(() => goalCounts(scoped), [scoped])
    const active = useMemo(() => activeGoals(scoped), [scoped])
    const upcoming = useMemo(() => buildUpcomingRows(scoped), [scoped])
    const completed = useMemo(() => buildCompletedRows(scoped), [scoped])
    const archived = useMemo(() => archivedGoals(scoped), [scoped])

    return (
        <div className="flex w-full flex-col gap-6 px-6 py-6">
            <header>
                <h1 className="text-xl font-semibold text-(--color-text)">Goals</h1>
                <p className="mt-1 text-sm text-(--color-text-muted)">Track milestone goals across key metrics. Focus on what matters most.</p>
            </header>

            {loading ? (
                <p className="text-sm text-(--color-text-muted)">Loading goals…</p>
            ) : scoped.length === 0 ? (
                <div className="flex flex-col items-center gap-4">
                    {/* A new account has no numeric goals yet — lead with the guide. */}
                    <div className="w-full max-w-md"><GettingStartedCard /></div>
                    <div className="w-full max-w-md rounded-md border border-dashed border-(--color-border) bg-(--color-surface) px-6 py-10 text-center">
                        <p className="text-sm font-semibold text-(--color-text)">No goals yet</p>
                        <p className="mt-1 text-sm text-(--color-text-muted)">Launch a product and connect its data to start earning milestone goals.</p>
                    </div>
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="flex min-w-0 flex-col gap-6">
                    <GoalTabs tab={tab} onChange={setTab} counts={counts} />

                    {tab === 'active' && (
                        <section role="tabpanel" id="goals-panel-active" aria-labelledby="goals-tab-active">
                            <SectionHeading title="Active Goals" description="The current milestones you're working on." />
                            {active.length === 0 ? (
                                <p className="text-sm text-(--color-text-muted)">No active goals right now.</p>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {active.map(s => <ActiveGoalCard key={`${s.scope}-${s.goal.id}`} scoped={s} />)}
                                </div>
                            )}
                        </section>
                    )}

                    {tab === 'upcoming' && (
                        <section role="tabpanel" id="goals-panel-upcoming" aria-labelledby="goals-tab-upcoming">
                            <SectionHeading title="Upcoming Goals" description="These milestones stay locked until the current goal is completed — their clock starts then." />
                            {upcoming.length === 0 ? (
                                <p className="text-sm text-(--color-text-muted)">No upcoming milestones.</p>
                            ) : (
                                <div className="overflow-x-auto rounded-md border border-(--color-border) bg-(--color-card)">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-(--color-border) text-xs text-(--color-text-muted)">
                                                <th className="px-4 py-2 font-medium">Goal</th>
                                                <th className="px-4 py-2 font-medium">Group</th>
                                                <th className="px-4 py-2 font-medium">Target</th>
                                                <th className="px-4 py-2 font-medium">Unlocks</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {upcoming.map(row => (
                                                <tr key={row.key} className="border-b border-(--color-border) last:border-0">
                                                    <td className="px-4 py-2 text-(--color-text)">{row.goalName}</td>
                                                    <td className="px-4 py-2"><ScopeBadge scope={row.scope} name={row.scope === 'project' ? row.scopeLabel : undefined} /></td>
                                                    <td className="px-4 py-2 tabular-nums text-(--color-text)">{formatGoalValue(row.metricKey, row.threshold)}</td>
                                                    <td className="px-4 py-2 text-(--color-text-muted)">After {row.afterLabel} · ~{row.estimateDays}d</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    )}

                    {tab === 'completed' && (
                        <section role="tabpanel" id="goals-panel-completed" aria-labelledby="goals-tab-completed">
                            <SectionHeading title="Completed Goals" description="Milestones you've already reached." />
                            {completed.length === 0 ? (
                                <p className="text-sm text-(--color-text-muted)">No completed milestones yet.</p>
                            ) : (
                                <ul className="flex flex-col divide-y divide-(--color-border) rounded-md border border-(--color-border) bg-(--color-card)">
                                    {completed.map(row => (
                                        <li key={row.key} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <span className="truncate text-(--color-text)">{row.goalName} · {row.label}</span>
                                                <ScopeBadge scope={row.scope} name={row.scope === 'project' ? row.scopeLabel : undefined} />
                                            </div>
                                            <span className="shrink-0 text-xs text-(--color-text-muted)">Completed {formatGoalDate(row.completedAt)}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    )}

                    {tab === 'archived' && (
                        <section role="tabpanel" id="goals-panel-archived" aria-labelledby="goals-tab-archived">
                            <SectionHeading title="Archived Goals" description="Goal groups where every milestone is complete." />
                            {archived.length === 0 ? (
                                <div className="rounded-md border border-dashed border-(--color-border) bg-(--color-surface) px-6 py-12 text-center">
                                    <p className="text-sm font-semibold text-(--color-text)">No archived goals yet</p>
                                    <p className="mt-1 text-sm text-(--color-text-muted)">A goal group moves here once every milestone in it is complete.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {archived.map(({ goal, scope, scopeLabel }) => (
                                        <div key={`${scopeLabel}-${goal.id}`} className="flex items-center justify-between gap-3 rounded-md border border-(--color-border) bg-(--color-card) px-4 py-3 text-sm">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <span className="truncate font-medium text-(--color-text)">{goalDisplayName(goal)}</span>
                                                <ScopeBadge scope={scope} name={scope === 'project' ? scopeLabel : undefined} />
                                                <Chip label={goal.title} tone="muted" />
                                            </div>
                                            <Chip label="All milestones complete" tone="success" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    </div>

                    <aside className="flex min-w-0 flex-col gap-4">
                        <GettingStartedCard />
                        <GoalProgressOverview scoped={scoped} />
                        <TimelineOutlook scoped={scoped} />
                    </aside>
                </div>
            )}
        </div>
    )
}
