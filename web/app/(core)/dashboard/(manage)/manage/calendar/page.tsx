'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Flag, Target, CheckCircle2, SquareCheckBig, Rocket, X, ChevronRight } from 'lucide-react'
import { useWorkspace } from '@/app/(core)/dashboard/contexts/WorkspaceContext'
import { fetchJson } from '@/lib/fetchJson'
import { routes } from '@/app/util/routes'
import ProjectTimelineBar from '@/app/(core)/dashboard/components/ProjectTimelineBar'
import { PipelineCard } from '@/lib/types/cluster'
import {
    WEEKDAY_LABELS, buildMonthGrid, monthLabel, shiftMonth,
} from '@/lib/calendar'
import { buildEvents, type CalendarTask, type CalendarEvent, type CalendarEventType, type CalendarEventStatus } from '@/lib/calendarEvents'
import type { Goal } from '@/lib/types/goals'
import { buildAccountTimelineModel } from '@/lib/timelineView'
import { GettingStartedNextHint } from '@/app/(core)/dashboard/components/GettingStarted'
import { LegendKey } from '@/app/(core)/dashboard/components/LegendKey'
import TimelineGantt from './TimelineGantt'

type CalendarMode = 'timeline' | 'month'
type CalendarScope = 'account' | 'project'

const MAX_CHIPS_PER_DAY = 3

// Type → icon + label (what an event is); status → colour (where it stands).
const TYPE_META: Record<CalendarEventType, { Icon: typeof Flag; label: string }> = {
    phase: { Icon: Flag, label: 'Phase' },
    'goal-target': { Icon: Target, label: 'Goal target' },
    milestone: { Icon: CheckCircle2, label: 'Milestone' },
    task: { Icon: SquareCheckBig, label: 'Task' },
    launch: { Icon: Rocket, label: 'Launch' },
}
const STATUS_TEXT: Record<CalendarEventStatus, string> = {
    upcoming: 'text-(--color-text-muted)',
    'due-soon': 'text-(--color-warning)',
    completed: 'text-(--color-success)',
    overdue: 'text-(--color-error)',
}

// One event as a compact chip: type icon tinted by status, overdue gets a red
// edge, completed reads muted/struck. Clicking selects the day (opens the panel).
function MonthChip({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
    const { Icon } = TYPE_META[event.type]
    return (
        <button
            type="button"
            onClick={onClick}
            title={`${TYPE_META[event.type].label}: ${event.label}${event.detail ? ` · ${event.detail}` : ''}`}
            className={`flex w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium transition-colors hover:bg-(--color-bg) ${event.status === 'overdue' ? 'bg-(--color-error-soft)' : 'bg-(--color-surface-tint)'}`}
        >
            <Icon className={`h-3 w-3 shrink-0 ${STATUS_TEXT[event.status]}`} aria-hidden />
            <span className={`truncate ${event.status === 'completed' ? 'text-(--color-text-muted) line-through' : 'text-(--color-text)'}`}>{event.label}</span>
        </button>
    )
}

// Contextual destination for an event when clicked through from the panel.
function eventHref(type: CalendarEventType): string | null {
    if (type === 'goal-target' || type === 'milestone') return routes.core.goals
    if (type === 'task') return routes.core.tasks
    return null // phase / launch → stay on the timeline
}

function DayPanel({ dateLabel, events, onClose, onViewTimeline }: { dateLabel: string; events: CalendarEvent[]; onClose: () => void; onViewTimeline: () => void }) {
    // Non-modal side panel (the calendar behind it stays usable), so it's a named
    // complementary region rather than a dialog — but Escape still closes it.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [onClose])
    return (
        <aside aria-label={`Scheduled for ${dateLabel}`} className="flex w-72 shrink-0 flex-col rounded-md border border-(--color-border) bg-(--color-card) shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between border-b border-(--color-border) px-3 py-2">
                <h3 className="text-sm font-semibold text-(--color-text)">{dateLabel}</h3>
                <button type="button" onClick={onClose} aria-label="Close" className="grid h-6 w-6 place-items-center rounded text-(--color-text-muted) hover:bg-(--color-bg) hover:text-(--color-text)">
                    <X className="h-4 w-4" />
                </button>
            </div>
            {events.length === 0 ? (
                <p className="px-3 py-4 text-xs text-(--color-text-muted)">Nothing scheduled.</p>
            ) : (
                <ul className="flex flex-col divide-y divide-(--color-border) overflow-y-auto">
                    {events.map(event => {
                        const { Icon, label: typeLabel } = TYPE_META[event.type]
                        const href = eventHref(event.type)
                        const Row = (
                            <div className="flex items-start gap-2 px-3 py-2">
                                <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${STATUS_TEXT[event.status]}`} aria-hidden />
                                <div className="min-w-0 flex-1">
                                    <p className={`text-xs font-medium ${event.status === 'completed' ? 'text-(--color-text-muted) line-through' : 'text-(--color-text)'}`}>{event.label}</p>
                                    <p className="text-[10px] text-(--color-text-faint)">{typeLabel}{event.detail ? ` · ${event.detail}` : ''}</p>
                                </div>
                                {href && <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-(--color-text-faint)" aria-hidden />}
                            </div>
                        )
                        return (
                            <li key={event.key}>
                                {href ? <Link href={href} className="block hover:bg-(--color-bg)">{Row}</Link> : Row}
                            </li>
                        )
                    })}
                </ul>
            )}
            <button type="button" onClick={onViewTimeline} className="mt-auto border-t border-(--color-border) px-3 py-2 text-left text-xs font-semibold text-(--color-link) hover:text-(--color-link-hover)">
                View on timeline
            </button>
        </aside>
    )
}

export default function CalendarPage() {
    const { selectedPipelineId, hydrated } = useWorkspace()
    const pipelineId = hydrated ? selectedPipelineId : null
    const [tasks, setTasks] = useState<CalendarTask[]>([])
    const [card, setCard] = useState<PipelineCard | null>(null)
    const [goals, setGoals] = useState<Goal[]>([])
    const [loading, setLoading] = useState(false)

    // Account-level view: the portfolio's shared goals on one timeline.
    const [accountGoals, setAccountGoals] = useState<Goal[]>([])
    const [accountLoading, setAccountLoading] = useState(false)

    // Scope follows the global top-bar workspace selector: a project → Project,
    // Account (no project) → the portfolio timeline. No separate local toggle.
    const scope: CalendarScope = pipelineId ? 'project' : 'account'

    const today = useMemo(() => new Date(), [])
    const [view, setView] = useState<{ year: number; month: number }>(() => ({ year: today.getFullYear(), month: today.getMonth() }))
    // Default to the Timeline (Gantt) view — the month grid hides duration/progress.
    const [mode, setMode] = useState<CalendarMode>('timeline')
    // Day whose events are shown in the side panel (month view).
    const [selectedKey, setSelectedKey] = useState<string | null>(null)

    useEffect(() => {
        if (!pipelineId || !hydrated) return
        let active = true
        const run = async () => {
            setLoading(true)
            try {
                const [tj, cj, gj] = await Promise.all([
                    fetchJson<{ data: CalendarTask[] }>(`/api/tasks?pipeline_id=${pipelineId}`),
                    fetchJson<{ data: PipelineCard }>(`/api/pipeline/${pipelineId}`),
                    fetchJson<{ data: Goal[] }>(`/api/portfolio/${pipelineId}/goals`).catch(() => ({ data: [] as Goal[] })),
                ])
                if (!active) return
                setTasks(tj?.data ?? [])
                setCard(cj?.data ?? null)
                setGoals(gj?.data ?? [])
            } finally {
                if (active) setLoading(false)
            }
        }
        void run()
        return () => { active = false }
    }, [pipelineId, hydrated])

    useEffect(() => {
        if (!hydrated || scope !== 'account') return
        let active = true
        const run = async () => {
            setAccountLoading(true)
            try {
                const gj = await fetchJson<{ data: Goal[] }>('/api/portfolio/goals').catch(() => ({ data: [] as Goal[] }))
                if (!active) return
                setAccountGoals(gj?.data ?? [])
            } finally {
                if (active) setAccountLoading(false)
            }
        }
        void run()
        return () => { active = false }
    }, [hydrated, scope])

    const events = useMemo(() => buildEvents(tasks, card, goals), [tasks, card, goals])
    const weeks = useMemo(() => buildMonthGrid(view.year, view.month, today), [view, today])
    const accountModel = useMemo(() => buildAccountTimelineModel(accountGoals, today), [accountGoals, today])
    const selectedDay = useMemo(() => weeks.flat().find(d => d.key === selectedKey) ?? null, [weeks, selectedKey])

    const goToday = () => setView({ year: today.getFullYear(), month: today.getMonth() })
    const step = (delta: number) => setView(prev => shiftMonth(prev.year, prev.month, delta))

    const navBtn = 'grid h-8 w-8 place-items-center text-(--color-text-muted) transition-colors hover:bg-(--color-bg) hover:text-(--color-text)'

    return (
        <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col gap-4 overflow-hidden px-6 py-6">
            {/* Controls. Scope comes from the global top-bar selector; here we only pick
                the view (Timeline/Month, project scope only). */}
            <div className="flex flex-wrap items-center gap-3">
                {scope === 'project' && (
                    <div role="tablist" aria-label="Calendar view" className="flex items-center rounded-md border border-(--color-border) bg-(--color-card) p-0.5 shadow-[var(--shadow-sm)]">
                        {(['timeline', 'month'] as CalendarMode[]).map(m => (
                            <button
                                key={m}
                                type="button"
                                role="tab"
                                aria-selected={mode === m}
                                onClick={() => setMode(m)}
                                className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition-colors ${mode === m ? 'bg-(--color-text) text-(--color-bg)' : 'text-(--color-text-muted) hover:text-(--color-text)'}`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                )}
                {((scope === 'account' && accountLoading) || (scope === 'project' && loading)) && <span className="text-xs text-(--color-text-faint)">Loading…</span>}
                <Link href={routes.core.goals} className="ml-auto shrink-0 text-xs font-semibold text-(--color-link) hover:text-(--color-link-hover)">
                    Manage goals
                </Link>
            </div>

            {scope === 'account' && (
                <div className="flex min-h-0 flex-1 flex-col gap-4">
                    <GettingStartedNextHint />
                    <TimelineGantt model={accountModel} />
                </div>
            )}

            {scope === 'project' && pipelineId && (
                <div className="flex min-h-0 flex-1 flex-col gap-4">
                    <ProjectTimelineBar pipelineId={pipelineId} />
                    {mode === 'month' && (
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center overflow-hidden rounded-md border border-(--color-border) bg-(--color-card) shadow-[var(--shadow-sm)]">
                                    <button onClick={() => step(-1)} aria-label="Previous month" className={navBtn}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
                                    </button>
                                    <h2 className="min-w-40 border-x border-(--color-border) px-3 py-1.5 text-center text-sm font-semibold tracking-tight text-(--color-text)">
                                        {monthLabel(view.year, view.month)}
                                    </h2>
                                    <button onClick={() => step(1)} aria-label="Next month" className={navBtn}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                                    </button>
                                </div>
                                <button onClick={goToday} className="rounded-md border border-(--color-border) bg-(--color-card) px-3 py-1.5 text-xs font-semibold text-(--color-text-muted) shadow-[var(--shadow-sm)] transition-colors hover:text-(--color-text)">
                                    Today
                                </button>
                            </div>
                            <div className="flex flex-wrap items-center gap-3.5">
                                <LegendKey swatch="bg-(--color-text-faint)" label="Upcoming" />
                                <LegendKey swatch="bg-(--color-warning)" label="Due soon" />
                                <LegendKey swatch="bg-(--color-error)" label="Overdue" />
                                <LegendKey swatch="bg-(--color-success)" label="Completed" />
                                <span className="text-[11px] text-(--color-text-faint)">· icons show the type</span>
                            </div>
                        </div>
                    )}

                    {mode === 'timeline' && <TimelineGantt card={card} goals={goals} tasks={tasks} />}

                    {mode === 'month' && (
                    <div className="flex min-h-0 flex-1 gap-3">
                        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-(--color-border) bg-(--color-card) shadow-[var(--shadow-sm)]">
                            <div className="grid shrink-0 grid-cols-7 border-b border-(--color-border) bg-(--color-card)">
                                {WEEKDAY_LABELS.map(label => (
                                    <div key={label} className="px-2 py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-(--color-text-faint)">
                                        {label}
                                    </div>
                                ))}
                            </div>
                            <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6">
                                {weeks.flat().map(day => {
                                    const dayEvents = events[day.key] ?? []
                                    const isSelected = selectedKey === day.key
                                    return (
                                        <div key={day.key} onClick={() => setSelectedKey(day.key)}
                                             className={`flex min-h-0 cursor-pointer flex-col gap-1 border-b border-r border-(--color-border) p-1.5 text-left transition-colors last:border-r-0 ${
                                                 isSelected ? 'ring-1 ring-inset ring-(--color-accent)' : ''
                                             } ${day.isToday ? 'bg-(--color-accent-soft)' : day.inCurrentMonth ? 'hover:bg-(--color-bg)' : 'bg-(--color-bg)'}`}>
                                            <div className="flex justify-end">
                                                <span className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs ${
                                                    day.isToday
                                                        ? 'bg-(--color-accent) font-bold text-(--color-white) shadow-[var(--shadow-sm)]'
                                                        : day.inCurrentMonth ? 'font-medium text-(--color-text)' : 'text-(--color-text-faint)'
                                                }`}>
                                                    {day.date.getDate()}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                {dayEvents.slice(0, MAX_CHIPS_PER_DAY).map(event => (
                                                    <MonthChip key={event.key} event={event} onClick={() => setSelectedKey(day.key)} />
                                                ))}
                                                {dayEvents.length > MAX_CHIPS_PER_DAY && (
                                                    <span className="px-1 text-[10px] font-medium text-(--color-text-muted)">
                                                        +{dayEvents.length - MAX_CHIPS_PER_DAY} more
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                        {selectedDay && (
                            <DayPanel
                                dateLabel={selectedDay.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                events={events[selectedDay.key] ?? []}
                                onClose={() => setSelectedKey(null)}
                                onViewTimeline={() => { setMode('timeline'); setSelectedKey(null) }}
                            />
                        )}
                    </div>
                    )}
                </div>
            )}
        </div>
    )
}
