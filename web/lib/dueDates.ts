// Per-task due-date helpers (Phase 2). Due dates are day-granular ISO strings
// ('YYYY-MM-DD'); urgency is relative to today and a task that is done carries
// no urgency regardless of its date.

export const DUE_SOON_DAYS = 3

export type DueStatus = 'none' | 'overdue' | 'due_soon' | 'upcoming'

const DAY_MS = 24 * 60 * 60 * 1000

// Parse a 'YYYY-MM-DD' string as a *local* calendar date (midnight local),
// avoiding the UTC shift `new Date('YYYY-MM-DD')` would introduce.
export function parseLocalDate(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

// Whole calendar days from today to the due date (negative = past).
export function daysUntil(dueIso: string, now: Date = new Date()): number {
    const due = startOfDay(parseLocalDate(dueIso)).getTime()
    const today = startOfDay(now).getTime()
    return Math.round((due - today) / DAY_MS)
}

export function dueStatus(
    dueIso: string | null,
    taskStatus: string,
    now: Date = new Date(),
): DueStatus {
    if (!dueIso || taskStatus === 'done') return 'none'
    const delta = daysUntil(dueIso, now)
    if (delta < 0) return 'overdue'
    if (delta <= DUE_SOON_DAYS) return 'due_soon'
    return 'upcoming'
}

const DATE_FMT: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }

// Short human label for a due date, e.g. "Overdue", "Due today",
// "Due tomorrow", "Due Jul 1".
export function dueLabel(dueIso: string, taskStatus: string, now: Date = new Date()): string {
    const delta = daysUntil(dueIso, now)
    const dateText = parseLocalDate(dueIso).toLocaleDateString(undefined, DATE_FMT)
    if (taskStatus === 'done') return `Due ${dateText}`
    if (delta < 0) return `Overdue · ${dateText}`
    if (delta === 0) return 'Due today'
    if (delta === 1) return 'Due tomorrow'
    return `Due ${dateText}`
}

// Tailwind classes for a due-date pill by urgency, using the dashboard palette
// (overdue = error, due soon = warning, otherwise muted).
export function duePillClass(status: DueStatus): string {
    switch (status) {
        case 'overdue':
            return 'bg-(--color-error-soft) text-(--color-error)'
        case 'due_soon':
            return 'bg-(--color-warning-soft) text-(--color-warning)'
        default:
            return 'bg-(--color-bg) text-(--color-text-muted)'
    }
}
