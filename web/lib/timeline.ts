// Phase 1 launch-timeline helpers, shared by the project-setup modal, the
// project header timeline bar, and the pipeline card progress bars.
//
// A timeline is a fixed window of `timeline_days` (14, 30, 60 or 90). The window
// is split 30/70: the first 30% of days is the Discovery phase, the remaining
// 70% is the Build phase. The launch target is the end of the window.

export const DISCOVERY_FRACTION = 0.3

const DAY_MS = 24 * 60 * 60 * 1000

export interface TimelineOption {
    days: number
    label: string
}

export const TIMELINE_OPTIONS: TimelineOption[] = [
    { days: 14, label: '2 weeks' },
    { days: 30, label: '30 days' },
    { days: 60, label: '60 days' },
    { days: 90, label: '90 days' },
]

export type TimelinePhase = 'discovery' | 'build' | 'overdue'

export interface TimelineMilestones {
    discoveryEnd: Date
    launchTarget: Date
}

// Discovery end and launch target dates for a window that begins at `start`.
export function timelineMilestones(start: Date, days: number): TimelineMilestones {
    return {
        discoveryEnd: new Date(start.getTime() + days * DISCOVERY_FRACTION * DAY_MS),
        launchTarget: new Date(start.getTime() + days * DAY_MS),
    }
}

export interface TimelineProgress {
    dayX: number
    totalDays: number
    percent: number
    phase: TimelinePhase
    phaseLabel: string
    overdue: boolean
    launched: boolean
}

// Live progress for a project's timeline. `launchedAt` short-circuits to a
// completed timeline. `now` is injectable for testing.
export function timelineProgress(
    startIso: string,
    days: number,
    launchedAt: string | null = null,
    now: Date = new Date(),
): TimelineProgress {
    const launched = Boolean(launchedAt)
    const start = new Date(startIso).getTime()
    const elapsedDays = (now.getTime() - start) / DAY_MS
    const overdue = !launched && elapsedDays > days

    const phase: TimelinePhase = overdue
        ? 'overdue'
        : elapsedDays < days * DISCOVERY_FRACTION
            ? 'discovery'
            : 'build'

    const phaseLabel = overdue
        ? 'Past target launch date'
        : phase === 'discovery'
            ? 'Discovery Phase'
            : 'Build Phase'

    const dayX = Math.min(Math.max(Math.floor(elapsedDays) + 1, 1), days)
    const percent = launched ? 100 : Math.min(Math.max((elapsedDays / days) * 100, 0), 100)

    return { dayX, totalDays: days, percent, phase, phaseLabel, overdue, launched }
}

// Tailwind background class for a phase, kept here so the bar colors stay
// consistent everywhere and stay inside the dashboard palette.
export function phaseBarClass(phase: TimelinePhase): string {
    switch (phase) {
        case 'discovery':
            return 'bg-(--color-text)'
        case 'build':
            return 'bg-(--color-accent)'
        case 'overdue':
            return 'bg-(--color-error)'
    }
}

const DATE_FMT: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }

export function formatTimelineDate(date: Date): string {
    return date.toLocaleDateString(undefined, DATE_FMT)
}
