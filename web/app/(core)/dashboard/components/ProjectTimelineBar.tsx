'use client'
import { useEffect, useState } from 'react'
import { PipelineCard } from '@/lib/types/cluster'
import { fetchJson } from '@/lib/fetchJson'
import { timelineProgress, phaseBarClass } from '@/lib/timeline'
import TimelineOverduePrompt from '@/app/(core)/dashboard/components/TimelineOverduePrompt'

interface DeadlineSummary {
    overdue: number
    dueSoon: number
    nextDueDate: string | null
}

interface Props {
    pipelineId: string | null
    // Bump to force a re-fetch of the task deadline roll-up (e.g. after the
    // Tasks board mutates due dates).
    reloadToken?: number
}

// Project header strip shown on any project page (breakdown, tasks, signal):
// the launch-timeline progress bar plus an open-task deadline roll-up. Renders
// nothing unless the project has a timeline or at least one open due date.
export default function ProjectTimelineBar({ pipelineId, reloadToken = 0 }: Props) {
    // Loaded card tagged with the pipeline it belongs to, so a stale result from
    // a previous project is ignored once the selection changes.
    const [loaded, setLoaded] = useState<{ pipelineId: string; card: PipelineCard | null } | null>(null)
    const [deadlines, setDeadlines] = useState<{ pipelineId: string; summary: DeadlineSummary | null } | null>(null)
    // Bumped after the overdue prompt extends the timeline, to re-read the card.
    const [cardReload, setCardReload] = useState(0)

    useEffect(() => {
        if (!pipelineId) return
        let active = true
        async function load(id: string) {
            try {
                const json = await fetchJson<{ data: PipelineCard }>(`/api/pipeline/${id}`)
                if (active) setLoaded({ pipelineId: id, card: json?.data ?? null })
            } catch {
                if (active) setLoaded({ pipelineId: id, card: null })
            }
        }
        void load(pipelineId)
        return () => { active = false }
    }, [pipelineId, cardReload])

    useEffect(() => {
        if (!pipelineId) return
        let active = true
        async function load(id: string) {
            try {
                const summary = await fetchJson<DeadlineSummary>(`/api/tasks/deadline-summary?pipeline_id=${id}`)
                if (active) setDeadlines({ pipelineId: id, summary: summary ?? null })
            } catch {
                if (active) setDeadlines({ pipelineId: id, summary: null })
            }
        }
        void load(pipelineId)
        return () => { active = false }
    }, [pipelineId, reloadToken])

    const card = pipelineId && loaded?.pipelineId === pipelineId ? loaded.card : null
    const summary = pipelineId && deadlines?.pipelineId === pipelineId ? deadlines.summary : null

    const hasTimeline = Boolean(card && card.timelineDays && card.timelineStart)
    const overdue = summary?.overdue ?? 0
    const dueSoon = summary?.dueSoon ?? 0
    const hasDeadlines = overdue > 0 || dueSoon > 0

    if (!hasTimeline && !hasDeadlines) return null

    const launched = Boolean(card?.launchedAt)
    const progress = hasTimeline && card
        ? timelineProgress(card.timelineStart as string, card.timelineDays as number, card.launchedAt ?? null)
        : null

    return (
        <div className="mt-3.5 flex flex-col gap-2.5">
            {launched ? (
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-(--color-success-soft) bg-(--color-success-soft) px-3 py-1">
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-(--color-success) text-(--color-text)">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M20 6 9 17l-5-5" /></svg>
                    </span>
                    <span className="text-xs font-semibold text-(--color-text)">Launched</span>
                    <span className="text-xs text-(--color-text-muted)">· Launch timeline complete</span>
                </div>
            ) : progress ? (
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                            <span className={`h-2 w-2 rounded-full ${phaseBarClass(progress.phase)}`} />
                            <span className={progress.overdue ? 'text-(--color-error)' : 'text-(--color-text)'}>{progress.phaseLabel}</span>
                        </span>
                        <span className="text-xs font-medium tabular-nums text-(--color-text-muted)">
                            Day {progress.dayX} <span className="opacity-50">of</span> {progress.totalDays}
                        </span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-(--color-surface-tint)">
                        {/* discovery -> build handoff marker at 30% */}
                        {!progress.overdue && (
                            <span className="absolute inset-y-0 z-10 w-px bg-(--color-surface-raised)" style={{ left: '30%' }} aria-hidden />
                        )}
                        <div
                            className={`pf-bar-fill pf-bar-sheen h-full rounded-full ${phaseBarClass(progress.phase)}`}
                            style={{ width: `${progress.percent}%` }}
                        />
                    </div>
                </div>
            ) : null}

            {hasDeadlines && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    {overdue > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-(--color-error-soft) px-2.5 py-1 font-medium text-(--color-error)">
                            <span className="h-1.5 w-1.5 rounded-full bg-(--color-error)" />
                            {overdue} task{overdue !== 1 ? 's' : ''} overdue
                        </span>
                    )}
                    {dueSoon > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-(--color-warning-soft) px-2.5 py-1 font-medium text-(--color-warning)">
                            <span className="h-1.5 w-1.5 rounded-full bg-(--color-warning)" />
                            {dueSoon} due soon
                        </span>
                    )}
                </div>
            )}

            {progress?.overdue && pipelineId && (
                <TimelineOverduePrompt pipelineId={pipelineId} onExtended={() => setCardReload(v => v + 1)} />
            )}
        </div>
    )
}
