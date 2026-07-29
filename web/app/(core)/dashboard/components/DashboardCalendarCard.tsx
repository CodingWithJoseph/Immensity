'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { fetchJson } from '@/lib/fetchJson'
import { routes } from '@/app/util/routes'
import { PipelineCard } from '@/lib/types/cluster'
import { WEEKDAY_LABELS, buildMonthGrid, monthLabel } from '@/lib/calendar'
import { buildWorkspaceEvents, type CalendarTask, type WorkspaceCalendarProject } from '@/lib/calendarEvents'
import FeatureContextDot from '@/app/(core)/dashboard/components/FeatureContextDot'

const MAX_DOTS_PER_DAY = 3

export default function DashboardCalendarCard({ cards }: { cards: PipelineCard[] | null }) {
    const [projects, setProjects] = useState<WorkspaceCalendarProject[] | null>(null)

    const today = useMemo(() => new Date(), [])
    const year = today.getFullYear()
    const month = today.getMonth()

    useEffect(() => {
        if (cards == null) return
        const visibleCards = cards.filter(card => !card.removedAt)
        if (visibleCards.length === 0) {
            setProjects([])
            return
        }
        let active = true
        void (async () => {
            const loaded = await Promise.all(visibleCards.map(async card => {
                const json = await fetchJson<{ data: CalendarTask[] }>(`/api/tasks?pipeline_id=${card.id}`)
                return { card, tasks: json?.data ?? [] }
            }))
            if (!active) return
            setProjects(loaded)
        })()
        return () => { active = false }
    }, [cards])

    const events = useMemo(() => buildWorkspaceEvents(projects ?? []), [projects])
    const weeks = useMemo(() => buildMonthGrid(year, month, today), [year, month, today])

    return (
        <section className='flex h-full min-h-0 flex-col gap-2'>
            <div className='flex items-center justify-between pl-1 pr-3'>
                <div className='flex items-center gap-2'>
                    <FeatureContextDot category='manage' />
                    <h2 className='text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)'>Calendar</h2>
                </div>
                <Link href={routes.core.calendar} className='text-[11px] text-(--color-link) transition-colors hover:text-(--color-link-hover)'>Open</Link>
            </div>

            {projects == null ? (
                <div className='min-h-0 flex-1 animate-pulse rounded-md border border-(--color-border) bg-(--color-surface-tint)' />
            ) : (
                <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-(--color-border) bg-(--color-surface-raised) shadow-(--shadow-sm)'>
                    <div className='flex items-center justify-center px-2 py-1.5'>
                        <span className='text-xs font-semibold tracking-tight text-(--color-text)'>{monthLabel(year, month)}</span>
                    </div>
                    <div className='grid grid-cols-7 border-b border-(--color-border) bg-(--color-surface)'>
                        {WEEKDAY_LABELS.map(label => (
                            <div key={label} className='py-1 text-center text-[9px] font-semibold uppercase tracking-wider text-(--color-text-faint)'>
                                {label.slice(0, 1)}
                            </div>
                        ))}
                    </div>
                    <div className='grid min-h-0 flex-1 grid-cols-7 grid-rows-6'>
                        {weeks.flat().map(day => {
                            const dayEvents = events[day.key] ?? []
                            return (
                                <div key={day.key}
                                     className={`flex min-h-0 flex-col items-center gap-0.5 border-b border-r border-(--color-border) p-0.5 last:border-r-0 ${
                                         day.isToday ? 'bg-(--color-accent-soft)' : day.inCurrentMonth ? '' : 'bg-(--color-bg)'
                                     }`}>
                                    <span className={`grid h-5 min-w-5 place-items-center rounded-full text-[10px] ${
                                        day.isToday
                                            ? 'bg-(--color-accent) font-bold text-white'
                                            : day.inCurrentMonth ? 'font-medium text-(--color-text)' : 'text-(--color-text-faint)'
                                    }`}>
                                        {day.date.getDate()}
                                    </span>
                                    {dayEvents.length > 0 && (
                                        <div className='flex items-center gap-0.5'>
                                            {dayEvents.slice(0, MAX_DOTS_PER_DAY).map((event, i) => (
                                                <span key={i} title={event.label} className={`h-1 w-1 rounded-full ${event.dotClass}`} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </section>
    )
}
