// Shared date formatters used across the dashboard. `fallback` is what to show
// when the value is missing (each call site keeps its own wording — "Not yet",
// "No date", "—"); an unparseable value falls back to the raw string.

const DATE_OPTS: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
const DATE_TIME_OPTS: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }

export function formatDate(value: string | null | undefined, fallback = '—'): string {
    if (!value) return fallback
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('en-US', DATE_OPTS)
}

export function formatDateTime(value: string | null | undefined, fallback = '—'): string {
    if (!value) return fallback
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString('en-US', DATE_TIME_OPTS)
}
