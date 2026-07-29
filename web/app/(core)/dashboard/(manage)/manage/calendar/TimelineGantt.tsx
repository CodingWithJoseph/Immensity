'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { routes } from '@/app/util/routes'
import type { PipelineCard } from '@/lib/types/cluster'
import type { Goal } from '@/lib/types/goals'
import type { CalendarTask } from '@/lib/calendarEvents'
import { LegendKey } from '@/app/(core)/dashboard/components/LegendKey'
import {
    buildTimelineModel, positionPercent, axisTicks,
    type BarTone, type MarkerTone, type GanttModel, type GanttBar, type GanttMarker, type SoftNext, type AxisTick,
    type GanttPhase, type GanttLaunchMark,
} from '@/lib/timelineView'

const LABEL_W = 168
// Floor for the plotting track: below this (narrow screens) the chart scrolls
// horizontally; above it the track flexes to fill the width so the timeline
// always fits rather than overflowing and clipping on the right.
const MIN_TRACK = 560
// Breathing room on the right so an edge marker/label near 100% isn't clipped.
const RIGHT_GUTTER = 28
// A bar narrower than this (percent of the range) hides its inline label — the
// lane label + tooltip carry it instead of truncating to "Dis…".
const MIN_LABEL_PCT = 6
const DAY_MS = 24 * 60 * 60 * 1000

// Visible window options. 'fit' frames the active content (projections run off the
// right); the month options zoom in; 'all' shows everything incl. projections.
type WindowMode = 'fit' | 3 | 6 | 12 | 'all'
const WINDOW_OPTIONS: { mode: WindowMode; label: string }[] = [
    { mode: 'fit', label: 'Fit' },
    { mode: 3, label: '3m' },
    { mode: 6, label: '6m' },
    { mode: 12, label: '1y' },
    { mode: 'all', label: 'All' },
]

function addMonthsMs(ms: number, months: number): number {
    const d = new Date(ms)
    return new Date(d.getFullYear(), d.getMonth() + months, d.getDate()).getTime()
}

const BAR_CLASS: Record<BarTone, string> = {
    discovery: 'bg-(--color-text)',
    build: 'bg-(--color-accent)',
    overdue: 'bg-(--color-error)',
    'goal-active': 'bg-(--color-blue)',
    // Past target but not yet reached — still the elapsed-progress fill; the red
    // target diamond + countdown chip carry the "overdue" signal.
    'goal-overdue': 'bg-(--color-blue)',
    // A completed tier (expanded breakdown): its full, reached duration.
    'goal-done': 'bg-(--color-success)',
}

// Goal bars are drawn as a light "budget" track with a solid fill up to today,
// so each row shows how far through its active window it is (rather than one
// monolithic block that reads as "done" regardless of progress).
const TRACK_CLASS: Partial<Record<BarTone, string>> = {
    'goal-active': 'bg-(--color-blue-soft)',
    'goal-overdue': 'bg-(--color-error-soft)',
}
const FILL_CLASS: Partial<Record<BarTone, string>> = {
    'goal-active': 'bg-(--color-blue)',
    'goal-overdue': 'bg-(--color-error)',
}

const MARKER_CLASS: Record<MarkerTone, string> = {
    launched: 'bg-(--color-success)',
    target: 'bg-(--color-accent)',
    'target-overdue': 'bg-(--color-error)',
    'goal-done': 'bg-(--color-success)',
    'goal-target': 'bg-(--color-blue)',
    'goal-target-overdue': 'bg-(--color-error)',
    'task-overdue': 'bg-(--color-error)',
    'task-due-soon': 'bg-(--color-warning)',
    'task-todo': 'bg-(--color-text-faint)',
    'task-done': 'bg-(--color-success)',
}

// Launch phases as subtle full-height background bands (the "pace checker").
const PHASE_BAND_CLASS: Record<GanttPhase['tone'], string> = {
    discovery: 'bg-(--color-surface-tint)',
    build: 'bg-(--color-accent-soft)',
    overdue: 'bg-(--color-error-soft)',
}
const LAUNCH_LINE_CLASS: Record<GanttLaunchMark['tone'], string> = {
    launched: 'border-(--color-success)',
    target: 'border-(--color-accent)',
    'target-overdue': 'border-(--color-error)',
}

// Full-height launch bands + a dashed launch/target line, drawn behind a row's
// content so goals read against the launch journey.
function PhaseBands({ phases, launchMark, pct }: { phases: GanttPhase[]; launchMark?: GanttLaunchMark; pct: (ms: number) => number }) {
    return (
        <>
            {phases.map(phase => {
                const left = pct(phase.startMs)
                const width = Math.max(0, pct(phase.endMs) - left)
                return <span key={phase.key} className={`pointer-events-none absolute inset-y-0 opacity-60 ${PHASE_BAND_CLASS[phase.tone]}`} style={{ left: `${left}%`, width: `${width}%` }} aria-hidden />
            })}
            {launchMark && (
                <span className={`pointer-events-none absolute inset-y-0 z-[1] border-l-2 border-dashed ${LAUNCH_LINE_CLASS[launchMark.tone]}`} style={{ left: `${pct(launchMark.atMs)}%` }} aria-hidden />
            )}
        </>
    )
}

function fmt(ms: number): string {
    return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// The plotting area of one row: gridlines, today line, bars (goal bars split into
// elapsed/remaining), markers, and the optional soft "next" projection. Shared by
// lane rows and their expanded sub-rows.
function TrackBody({ bars, markers, softNext, ticks, nowMs, winEndMs, pct, todayLeft, phases, launchMark }: {
    bars: GanttBar[]
    markers: GanttMarker[]
    softNext?: SoftNext
    ticks: AxisTick[]
    nowMs: number
    winEndMs: number
    pct: (ms: number) => number
    todayLeft: number
    phases: GanttPhase[]
    launchMark?: GanttLaunchMark
}) {
    return (
        <>
            <PhaseBands phases={phases} launchMark={launchMark} pct={pct} />
            {ticks.map(tick => (
                <span key={tick.ms} className="absolute inset-y-0 w-px bg-(--color-border) opacity-60" style={{ left: `${pct(tick.ms)}%` }} aria-hidden />
            ))}
            <span className="absolute inset-y-0 z-10 w-px bg-(--color-accent)" style={{ left: `${todayLeft}%` }} aria-hidden />

            {bars.map(bar => {
                // Fully past the window edge → off view (a spanning bar still clips).
                if (bar.startMs >= winEndMs) return null
                const left = pct(bar.startMs)
                const width = Math.max(0.6, pct(bar.endMs) - left)
                const isProgress = bar.tone === 'goal-active' || bar.tone === 'goal-overdue'
                const span = bar.endMs - bar.startMs
                const fillPct = span > 0 ? Math.max(0, Math.min(1, (Math.min(nowMs, bar.endMs) - bar.startMs) / span)) * 100 : 100
                const label = width >= MIN_LABEL_PCT && (
                    <span className="relative z-[1] truncate text-[10px] font-semibold text-(--color-on-button)">{bar.label}</span>
                )
                return isProgress ? (
                    // The active goal is the row's focus — taller and full-strength.
                    <div
                        key={bar.key}
                        title={`${bar.label} · ${fmt(bar.startMs)} – ${fmt(bar.endMs)}`}
                        className={`absolute top-1/2 flex h-6 -translate-y-1/2 items-center overflow-hidden rounded-[4px] px-1.5 ring-1 ring-inset ring-black/5 ${TRACK_CLASS[bar.tone]}`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                    >
                        <span className={`absolute inset-y-0 left-0 ${FILL_CLASS[bar.tone]}`} style={{ width: `${fillPct}%` }} aria-hidden />
                        {label}
                    </div>
                ) : (
                    <div
                        key={bar.key}
                        title={`${bar.label} · ${fmt(bar.startMs)} – ${fmt(bar.endMs)}`}
                        className={`absolute top-1/2 flex h-5 -translate-y-1/2 items-center overflow-hidden rounded-[3px] px-1.5 ${BAR_CLASS[bar.tone]}`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                    >
                        {/* Too-narrow bars drop their label rather than truncate to "Dis…". */}
                        {label}
                    </div>
                )
            })}

            {markers.filter(m => m.atMs <= winEndMs).map(marker => (
                <span
                    key={marker.key}
                    title={`${marker.label} · ${fmt(marker.atMs)}${marker.chip ? ` · ${marker.chip.label}` : ''}`}
                    className="absolute top-1/2 z-[5] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                    style={{ left: `${pct(marker.atMs)}%` }}
                >
                    {marker.chip && (
                        <span className={`mb-0.5 whitespace-nowrap rounded-full px-1.5 text-[9px] font-semibold leading-4 ${marker.chip.tone === 'overdue' ? 'bg-(--color-error-soft) text-(--color-error)' : 'bg-(--color-surface-tint) text-(--color-text-muted)'}`}>
                            {marker.chip.label}
                        </span>
                    )}
                    <span className={`block h-2.5 w-2.5 rotate-45 rounded-[2px] border border-(--color-card) ${MARKER_CLASS[marker.tone]}`} />
                </span>
            ))}

            {softNext && softNext.startMs < winEndMs && (() => {
                const left = pct(softNext.startMs)
                const width = Math.max(0.6, pct(softNext.endMs) - left)
                return (
                    // Thin and faint so it recedes behind the active goal.
                    <div
                        title={`Next: ${softNext.label} · projected`}
                        className="absolute top-1/2 flex h-2.5 -translate-y-1/2 items-center overflow-hidden rounded-full border border-dashed border-(--color-blue) bg-(--color-blue-soft) px-1.5 opacity-50"
                        style={{ left: `${left}%`, width: `${width}%` }}
                    >
                        {width >= MIN_LABEL_PCT && (
                            <span className="truncate text-[9px] font-medium leading-none text-(--color-blue)">{softNext.label}</span>
                        )}
                    </div>
                )
            })()}
        </>
    )
}

export default function TimelineGantt({ card, goals, tasks, now, model: modelProp }: {
    card?: PipelineCard | null
    goals?: Goal[]
    tasks?: CalendarTask[]
    now?: Date
    // Prebuilt model (e.g. the account view). Overrides the per-project build.
    model?: GanttModel
}) {
    const model = useMemo(
        () => modelProp ?? buildTimelineModel(card ?? null, goals ?? [], tasks ?? [], now ?? new Date()),
        [modelProp, card, goals, tasks, now],
    )
    const [expanded, setExpanded] = useState<Set<string>>(new Set())
    const [windowMode, setWindowMode] = useState<WindowMode>('fit')

    // Furthest *active* endpoint (real bars + markers + today), excluding the soft
    // "next" projection — so "Fit" frames the work in progress and lets projections
    // run off the right edge.
    const activeEndMs = useMemo(() => {
        let end = model.nowMs
        for (const lane of model.lanes) {
            for (const bar of lane.bars) end = Math.max(end, bar.endMs)
            for (const marker of lane.markers) end = Math.max(end, marker.atMs)
        }
        return end
    }, [model])

    const winStart = model.startMs
    const winEnd = useMemo(() => {
        if (windowMode === 'all') return model.endMs
        if (windowMode === 'fit') return Math.min(model.endMs, activeEndMs + DAY_MS * 5)
        return Math.min(model.endMs, addMonthsMs(winStart, windowMode))
    }, [windowMode, model.endMs, activeEndMs, winStart])
    const ticks = useMemo(() => axisTicks(winStart, winEnd), [winStart, winEnd])

    if (model.empty) {
        return (
            <div className="grid flex-1 place-items-center rounded-md border border-dashed border-(--color-border) bg-(--color-card) p-10 text-center">
                <p className="text-sm text-(--color-text-muted)">No timeline yet — set a launch window, add goals, or give tasks due dates to see them here.</p>
            </div>
        )
    }

    const pct = (ms: number) => positionPercent(ms, winStart, winEnd)
    // Fit-to-width: the track flexes to fill the container, only scrolling once the
    // viewport drops below the floor.
    const contentMinWidth = LABEL_W + MIN_TRACK + RIGHT_GUTTER
    const todayLeft = pct(model.nowMs)
    const toggle = (id: string) => setExpanded(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
    })

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
                <LegendKey shape="square" swatch="bg-(--color-text)" label="Discovery" />
                <LegendKey shape="square" swatch="bg-(--color-accent)" label="Build" />
                <LegendKey shape="square" swatch="bg-(--color-blue)" label="Elapsed" />
                <LegendKey shape="square" swatch="bg-(--color-blue-soft)" label="Time remaining" />
                <LegendKey shape="square" swatch="bg-(--color-success)" label="Reached / launched" />
                <LegendKey shape="square" swatch="bg-(--color-error)" label="Overdue" />
                <LegendKey shape="square" swatch="border border-dashed border-(--color-blue) bg-(--color-blue-soft)" label="Next (projected)" />

                {/* Visible window: Fit frames the active work; months zoom; All shows projections. */}
                <div role="group" aria-label="Timeline window" className="ml-auto flex items-center rounded-md border border-(--color-border) bg-(--color-card) p-0.5 shadow-[var(--shadow-sm)]">
                    {WINDOW_OPTIONS.map(opt => (
                        <button
                            key={String(opt.mode)}
                            type="button"
                            aria-pressed={windowMode === opt.mode}
                            onClick={() => setWindowMode(opt.mode)}
                            className={`rounded px-2 py-0.5 text-[11px] font-semibold transition-colors ${windowMode === opt.mode ? 'bg-(--color-text) text-(--color-bg)' : 'text-(--color-text-muted) hover:text-(--color-text)'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Size to the lanes (a short chart shouldn't stretch to fill the viewport);
                scroll only when the lanes exceed the available height. */}
            <div className="max-h-full overflow-auto rounded-md border border-(--color-border) bg-(--color-card) shadow-[var(--shadow-sm)]">
                <div style={{ minWidth: contentMinWidth }}>
                    {/* Axis header */}
                    <div className="sticky top-0 z-20 flex border-b border-(--color-border) bg-(--color-card)">
                        <div className="sticky left-0 z-10 shrink-0 border-r border-(--color-border) bg-(--color-card)" style={{ width: LABEL_W }} />
                        <div className="relative h-8 flex-1">
                            <PhaseBands phases={model.phases} launchMark={model.launchMark} pct={pct} />
                            {ticks.map(tick => (
                                <span key={tick.ms} className="absolute top-0 h-full border-l border-(--color-border) pl-1 pt-1.5 text-[10px] font-medium text-(--color-text-muted)" style={{ left: `${pct(tick.ms)}%` }}>
                                    {tick.label}
                                </span>
                            ))}
                            {/* Phase labels centred over their bands. */}
                            {model.phases.filter(p => p.startMs < winEnd).map(phase => (
                                <span key={`lbl-${phase.key}`} className="absolute top-1 z-[2] -translate-x-1/2 whitespace-nowrap text-[9px] font-semibold uppercase tracking-wide text-(--color-text-muted)" style={{ left: `${(pct(phase.startMs) + pct(phase.endMs)) / 2}%` }}>
                                    {phase.label}
                                </span>
                            ))}
                            {model.launchMark && model.launchMark.atMs <= winEnd && (
                                <span className="absolute bottom-0.5 z-[2] -translate-x-1/2 whitespace-nowrap text-[9px] font-semibold text-(--color-text)" style={{ left: `${pct(model.launchMark.atMs)}%` }}>
                                    {model.launchMark.label}
                                </span>
                            )}
                            <span className="absolute inset-y-0 z-10 w-px bg-(--color-accent)" style={{ left: `${todayLeft}%` }} aria-hidden />
                        </div>
                        <div className="shrink-0" style={{ width: RIGHT_GUTTER }} aria-hidden />
                    </div>

                    {/* Lanes */}
                    {model.lanes.map(lane => {
                        const canExpand = (lane.subRows?.length ?? 0) > 1
                        const isOpen = expanded.has(lane.id)
                        return (
                            <div key={lane.id}>
                                <div className="flex border-b border-(--color-border) last:border-b-0">
                                    <div className="sticky left-0 z-10 flex shrink-0 items-center gap-1 border-r border-(--color-border) bg-(--color-card) pl-2 pr-3 text-xs font-medium text-(--color-text)" style={{ width: LABEL_W }}>
                                        {canExpand ? (
                                            <button type="button" onClick={() => toggle(lane.id)} aria-expanded={isOpen} aria-label={isOpen ? `Collapse ${lane.label}` : `Expand ${lane.label}`} className="grid h-4 w-4 shrink-0 place-items-center text-(--color-text-muted) hover:text-(--color-text)">
                                                <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                                            </button>
                                        ) : (
                                            <span className="h-4 w-4 shrink-0" aria-hidden />
                                        )}
                                        {lane.kind === 'goal' ? (
                                            <Link href={routes.core.goals} title={`Manage goal · ${lane.label}`} className="truncate text-(--color-link) hover:text-(--color-link-hover) hover:underline">
                                                {lane.label}
                                            </Link>
                                        ) : (
                                            <span className="truncate" title={lane.label}>{lane.label}</span>
                                        )}
                                    </div>
                                    <div className="relative h-11 flex-1 overflow-hidden">
                                        {/* When expanded, the summary bars give way to the per-part sub-rows. */}
                                        <TrackBody bars={isOpen ? [] : lane.bars} markers={isOpen ? [] : lane.markers} softNext={isOpen ? undefined : lane.softNext} ticks={ticks} nowMs={model.nowMs} winEndMs={winEnd} pct={pct} todayLeft={todayLeft} phases={model.phases} launchMark={model.launchMark} />
                                    </div>
                                    <div className="shrink-0" style={{ width: RIGHT_GUTTER }} aria-hidden />
                                </div>

                                {isOpen && lane.subRows?.map(sub => (
                                    <div key={sub.id} className="pf-fade-in flex border-b border-(--color-border) bg-(--color-bg) last:border-b-0">
                                        <div className="sticky left-0 z-10 flex shrink-0 items-center border-r border-(--color-border) bg-(--color-card) py-1.5 pl-8 pr-3 text-[11px] text-(--color-text-muted)" style={{ width: LABEL_W }}>
                                            <span className="truncate" title={sub.label}>{sub.label}</span>
                                        </div>
                                        <div className="relative h-8 flex-1 overflow-hidden">
                                            {sub.note ? (
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-dashed border-(--color-border) bg-(--color-surface-tint) px-2 py-0.5 text-[9px] font-medium text-(--color-text-muted)">
                                                    {sub.note}
                                                </span>
                                            ) : (
                                                <TrackBody bars={sub.bars} markers={sub.markers} ticks={ticks} nowMs={model.nowMs} winEndMs={winEnd} pct={pct} todayLeft={todayLeft} phases={model.phases} launchMark={model.launchMark} />
                                            )}
                                        </div>
                                        <div className="shrink-0" style={{ width: RIGHT_GUTTER }} aria-hidden />
                                    </div>
                                ))}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
