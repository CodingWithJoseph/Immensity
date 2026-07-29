// Pure builder for the Calendar's Timeline (Gantt) view. Turns the same data the
// month calendar uses — the launch timeline, goals, and task due dates — into
// positioned lanes of bars (date ranges) and markers (points) plus an overall
// time range. Kept framework-free and unit-tested; TimelineGantt renders it.

import { DISCOVERY_FRACTION } from '@/lib/timeline'
import { dueStatus } from '@/lib/dueDates'
import { goalDisplayName, daysLeftLabel } from '@/lib/goalsView'
import type { PipelineCard } from '@/lib/types/cluster'
import type { Goal } from '@/lib/types/goals'
import type { CalendarTask } from '@/lib/calendarEvents'

const DAY_MS = 24 * 60 * 60 * 1000

export type BarTone = 'discovery' | 'build' | 'overdue' | 'goal-active' | 'goal-overdue' | 'goal-done'
export type MarkerTone = 'launched' | 'target' | 'target-overdue' | 'goal-done' | 'goal-target' | 'goal-target-overdue' | 'task-overdue' | 'task-due-soon' | 'task-todo' | 'task-done'
export type LaneKind = 'launch' | 'goal' | 'tasks'

export interface GanttBar {
    key: string
    label: string
    startMs: number
    endMs: number
    tone: BarTone
}

export interface GanttMarker {
    key: string
    label: string
    atMs: number
    tone: MarkerTone
    // Deadline metadata rendered as a small chip beside the marker (kept off the
    // bar so a countdown never reads as measured progress).
    chip?: { label: string; tone: 'muted' | 'overdue' }
}

// The single next goal tier after the active one — the immediate "what's next",
// drawn as a muted, light bar in the goal's own colour family (not a hard
// deadline). Only the next tier is shown; further tiers stay off the chart to
// avoid clutter.
export interface SoftNext {
    key: string
    label: string
    startMs: number
    endMs: number
}

// One component piece of a lane, revealed when the lane is expanded: a launch
// phase (Discovery/Build/stage) or a single goal tier (completed / active /
// locked). Collapsed, the lane shows its summary bars/markers; expanded, these
// break the lane into its parts — one row each.
export interface GanttSubRow {
    id: string
    label: string
    bars: GanttBar[]
    markers: GanttMarker[]
    // For a locked (upcoming) tier that has no dated bar — a muted explanation
    // ("Locked · starts after 10") shown in place of a bar.
    note?: string
}

export interface GanttLane {
    id: string
    label: string
    kind: LaneKind
    bars: GanttBar[]
    markers: GanttMarker[]
    softNext?: SoftNext
    // Expandable breakdown (phases / tiers). Undefined or empty = not expandable.
    subRows?: GanttSubRow[]
}

// The launch journey rendered as vertical bands behind every lane (a "pace
// checker") rather than its own row: each phase (Discovery/Build, or the real
// stage bands) is a full-height region; launchMark is the launched/target line.
export interface GanttPhase {
    key: string
    label: string
    startMs: number
    endMs: number
    tone: 'discovery' | 'build' | 'overdue'
}

export interface GanttLaunchMark {
    atMs: number
    label: string
    tone: 'launched' | 'target' | 'target-overdue'
}

export interface GanttModel {
    lanes: GanttLane[]
    startMs: number
    endMs: number
    nowMs: number
    empty: boolean
    // Vertical launch phase bands + marker (project view only; empty for account).
    phases: GanttPhase[]
    launchMark?: GanttLaunchMark
}

export interface AxisTick {
    ms: number
    label: string
}

// Local-midnight timestamp for the day portion of any date string, so full ISO
// timestamps and plain 'YYYY-MM-DD' dates line up on the same day grid without
// timezone drift (matches the month calendar's day keying).
function dayMs(iso: string): number {
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
    return new Date(y, m - 1, d).getTime()
}

function addDaysMs(ms: number, days: number): number {
    return ms + days * DAY_MS
}

// 0–100 position of a timestamp within [startMs, endMs], clamped.
export function positionPercent(ms: number, startMs: number, endMs: number): number {
    if (endMs <= startMs) return 0
    return Math.min(100, Math.max(0, ((ms - startMs) / (endMs - startMs)) * 100))
}

// First-of-month ticks within the range, for axis gridlines/labels.
export function axisTicks(startMs: number, endMs: number): AxisTick[] {
    const ticks: AxisTick[] = []
    const start = new Date(startMs)
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
    // Begin at the first month boundary at or after startMs.
    if (cursor.getTime() < startMs) cursor.setMonth(cursor.getMonth() + 1)
    while (cursor.getTime() <= endMs) {
        ticks.push({ ms: cursor.getTime(), label: cursor.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }) })
        cursor.setMonth(cursor.getMonth() + 1)
    }
    return ticks
}

const STAGE_LABEL: Record<string, string> = {
    watching: 'Watching', discovery: 'Discovery', exploring: 'Exploring', validating: 'Validating', building: 'Building',
}

// The launch journey as vertical phase bands + a launch/target marker (rendered
// behind every lane, a "pace checker"), rather than its own row. Uses real stage
// history when present (watching → … → building), else the approximate two-phase
// Discovery/Build split. Empty when the project has no launch timeline.
function buildPhases(card: PipelineCard | null, nowMs: number): { bands: GanttPhase[]; mark?: GanttLaunchMark } {
    if (!card) return { bands: [] }
    const launchedMs = card.launchedAt ? dayMs(card.launchedAt) : null
    const targetMs = card.timelineTargetLaunch
        ? dayMs(card.timelineTargetLaunch)
        : (card.timelineStart && card.timelineDays ? addDaysMs(dayMs(card.timelineStart), card.timelineDays) : null)

    const mark: GanttLaunchMark | undefined = launchedMs != null
        ? { atMs: launchedMs, label: 'Launched', tone: 'launched' }
        : targetMs != null
            ? { atMs: targetMs, label: 'Launch target', tone: nowMs > targetMs ? 'target-overdue' : 'target' }
            : undefined

    const events = card.stageEvents ?? []
    if (events.length > 0) {
        const sorted = [...events].sort((a, b) => dayMs(a.enteredAt) - dayMs(b.enteredAt))
        const bands: GanttPhase[] = sorted.map((event, i) => {
            const startMs = dayMs(event.enteredAt)
            const nextMs = i + 1 < sorted.length ? dayMs(sorted[i + 1].enteredAt) : (launchedMs ?? nowMs)
            return { key: `stage-${i}`, label: STAGE_LABEL[event.stage] ?? event.stage, startMs, endMs: Math.max(nextMs, startMs), tone: event.stage === 'building' ? 'build' : 'discovery' }
        })
        return { bands, mark }
    }

    if (card.timelineStart && card.timelineDays) {
        const startMs = dayMs(card.timelineStart)
        const discoveryEndMs = addDaysMs(startMs, Math.round(card.timelineDays * DISCOVERY_FRACTION))
        const endMs = launchedMs ?? targetMs ?? addDaysMs(startMs, card.timelineDays)
        const overdue = launchedMs == null && targetMs != null && nowMs > targetMs
        return {
            bands: [
                { key: 'discovery', label: 'Discovery', startMs, endMs: discoveryEndMs, tone: 'discovery' },
                { key: 'build', label: 'Build', startMs: discoveryEndMs, endMs, tone: overdue ? 'overdue' : 'build' },
            ],
            mark,
        }
    }

    return { bands: [], mark }
}

// One lane per goal, expressing the tier lifecycle Reached → Active →
// Next. Completed tiers are done-markers; the single active tier is a live bar
// ending at its target diamond (with a countdown chip); the immediate next tier
// is a muted "what's next" projection. Further tiers are omitted to keep the row
// readable.
function goalLane(goal: Goal): GanttLane | null {
    const lane: GanttLane = { id: `goal-${goal.id}`, label: goalDisplayName(goal), kind: 'goal', bars: [], markers: [] }

    for (const m of goal.milestones) {
        lane.markers.push({ key: `${goal.id}-done-${m.tierIndex}`, label: `${m.label} reached`, atMs: dayMs(m.achievedAt), tone: 'goal-done' })
    }

    const active = goal.activeTier
    if (active?.activatedAt && active.targetDate) {
        const targetMs = dayMs(active.targetDate)
        const overdue = active.daysLeft != null && active.daysLeft < 0
        lane.bars.push({
            key: `${goal.id}-active`,
            label: active.label,
            startMs: dayMs(active.activatedAt),
            endMs: targetMs,
            tone: overdue ? 'goal-overdue' : 'goal-active',
        })
        // The active deadline: a diamond at the target with the countdown as a
        // chip beside it (metadata, not progress).
        const countdown = daysLeftLabel(active.daysLeft)
        lane.markers.push({
            key: `${goal.id}-target`,
            label: `Target ${active.label}`,
            atMs: targetMs,
            tone: overdue ? 'goal-target-overdue' : 'goal-target',
            chip: countdown ? { label: countdown, tone: overdue ? 'overdue' : 'muted' } : undefined,
        })
        // Only the immediate next tier is shown — a muted, light projection right
        // after the active target (its estimate is soft, not a committed date).
        // Further tiers are omitted to keep the row uncluttered.
        const next = goal.tiers
            .filter(t => t.state === 'upcoming')
            .sort((a, b) => a.tierIndex - b.tierIndex)[0]
        if (next) {
            lane.softNext = { key: `${goal.id}-next`, label: next.label, startMs: targetMs, endMs: addDaysMs(targetMs, next.estimateDays) }
        }
    }

    // Expanded breakdown: the full tier ladder, one row per tier.
    lane.subRows = goalTierSubRows(goal)

    return lane.bars.length > 0 || lane.markers.length > 0 ? lane : null
}

// The full tier ladder for a goal, as expandable rows: completed tiers show
// their real duration (activation → reached), the active tier shows its live bar
// + countdown, and upcoming tiers are locked notes ("starts after …") with no
// fabricated date.
function goalTierSubRows(goal: Goal): GanttSubRow[] {
    const ordered = [...goal.tiers].sort((a, b) => a.tierIndex - b.tierIndex)
    const rows: GanttSubRow[] = []
    let prevLabel: string | null = null
    for (const t of ordered) {
        const id = `goal-${goal.id}-tier-${t.tierIndex}`
        if (t.state === 'completed' && t.activatedAt && t.completedAt) {
            const startMs = dayMs(t.activatedAt)
            const endMs = dayMs(t.completedAt)
            rows.push({
                id, label: t.label,
                bars: [{ key: `${id}-bar`, label: t.label, startMs, endMs: Math.max(endMs, startMs), tone: 'goal-done' }],
                markers: [{ key: `${id}-done`, label: `${t.label} reached`, atMs: endMs, tone: 'goal-done' }],
            })
        } else if (t.state === 'active' && t.activatedAt && t.targetDate) {
            const targetMs = dayMs(t.targetDate)
            const overdue = t.daysLeft != null && t.daysLeft < 0
            const countdown = daysLeftLabel(t.daysLeft)
            rows.push({
                id, label: t.label,
                bars: [{ key: `${id}-bar`, label: t.label, startMs: dayMs(t.activatedAt), endMs: targetMs, tone: overdue ? 'goal-overdue' : 'goal-active' }],
                markers: [{ key: `${id}-target`, label: `Target ${t.label}`, atMs: targetMs, tone: overdue ? 'goal-target-overdue' : 'goal-target', chip: countdown ? { label: countdown, tone: overdue ? 'overdue' : 'muted' } : undefined }],
            })
        } else {
            rows.push({ id, label: t.label, bars: [], markers: [], note: prevLabel ? `Locked · starts after ${prevLabel}` : 'Locked' })
        }
        prevLabel = t.label
    }
    return rows
}

function tasksLane(tasks: CalendarTask[], now: Date): GanttLane | null {
    const lane: GanttLane = { id: 'tasks', label: 'Tasks', kind: 'tasks', bars: [], markers: [] }
    for (const task of tasks) {
        if (!task.dueDate) continue
        const status = dueStatus(task.dueDate, task.status, now)
        const tone: MarkerTone = task.status === 'done'
            ? 'task-done'
            : status === 'overdue' ? 'task-overdue'
            : status === 'due_soon' ? 'task-due-soon'
            : 'task-todo'
        lane.markers.push({ key: task.id, label: task.title, atMs: dayMs(task.dueDate), tone })
    }
    return lane.markers.length > 0 ? lane : null
}

// Close a set of lanes into a full model: derive the time range from every dated
// endpoint (plus today so the "now" line is in view), padded slightly; an empty
// set yields a sensible window around today. Shared by the project and account
// builders so both frame their content identically.
function finalizeModel(lanes: GanttLane[], nowMs: number, phases: GanttPhase[] = [], launchMark?: GanttLaunchMark): GanttModel {
    const stamps: number[] = [nowMs]
    for (const lane of lanes) {
        for (const bar of lane.bars) stamps.push(bar.startMs, bar.endMs)
        for (const marker of lane.markers) stamps.push(marker.atMs)
        if (lane.softNext) stamps.push(lane.softNext.startMs, lane.softNext.endMs)
    }
    for (const phase of phases) stamps.push(phase.startMs, phase.endMs)
    if (launchMark) stamps.push(launchMark.atMs)
    let startMs = Math.min(...stamps)
    let endMs = Math.max(...stamps)
    if (startMs === endMs) {
        // Only "today" (no dated content) — show a month-ish window around now.
        startMs = addDaysMs(nowMs, -7)
        endMs = addDaysMs(nowMs, 30)
    } else {
        const pad = Math.max(DAY_MS * 2, Math.round((endMs - startMs) * 0.04))
        startMs -= pad
        endMs += pad
    }
    return { lanes, startMs, endMs, nowMs, empty: lanes.length === 0 && phases.length === 0, phases, launchMark }
}

/**
 * Build the Timeline (Gantt) model for one project. Goal lanes then a Tasks lane
 * appear top-down; the launch journey is rendered as vertical phase bands behind
 * them (not its own row). Range spans all dated content + the phases (plus today).
 */
export function buildTimelineModel(
    card: PipelineCard | null,
    goals: Goal[],
    tasks: CalendarTask[],
    now: Date = new Date(),
): GanttModel {
    const nowMs = now.getTime()
    const lanes: GanttLane[] = []

    for (const goal of goals) {
        const lane = goalLane(goal)
        if (lane) lanes.push(lane)
    }
    const tasksL = tasksLane(tasks, now)
    if (tasksL) lanes.push(tasksL)

    const { bands, mark } = buildPhases(card, nowMs)
    return finalizeModel(lanes, nowMs, bands, mark)
}

/**
 * Build the account-level Timeline (Gantt) model: one lane per account-wide goal.
 * This is the default view when no single project is selected, so the portfolio's
 * shared goals read at a glance. Per-product launch decomposition lives in the
 * Project view, where it's the focus; at the account level it's noise. Range
 * framing matches the project builder.
 */
export function buildAccountTimelineModel(
    accountGoals: Goal[],
    now: Date = new Date(),
): GanttModel {
    const nowMs = now.getTime()
    const lanes: GanttLane[] = []

    for (const goal of accountGoals) {
        const lane = goalLane(goal)
        if (lane) lanes.push(lane)
    }

    return finalizeModel(lanes, nowMs)
}
