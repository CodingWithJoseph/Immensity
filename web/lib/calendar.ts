// Month-grid helpers for the project Calendar view (Phase 4). Everything works
// in local calendar-day space and keys days by 'YYYY-MM-DD' so it lines up with
// task due dates (stored as plain dates) without timezone drift.

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export interface CalendarDay {
    date: Date
    key: string
    inCurrentMonth: boolean
    isToday: boolean
}

// Local 'YYYY-MM-DD' key for a Date.
export function toDateKey(date: Date): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

// Add (or subtract) whole days to a 'YYYY-MM-DD' key, returning a new key.
export function addDaysToKey(key: string, days: number): string {
    const [y, m, d] = key.split('-').map(Number)
    return toDateKey(new Date(y, m - 1, d + days))
}

// A 6-row month grid (always 42 cells) starting on the Sunday on/before the 1st,
// so the calendar height stays stable across months.
export function buildMonthGrid(year: number, month: number, today: Date = new Date()): CalendarDay[][] {
    const firstOfMonth = new Date(year, month, 1)
    const gridStart = new Date(year, month, 1 - firstOfMonth.getDay())
    const todayKey = toDateKey(today)

    const weeks: CalendarDay[][] = []
    const cursor = new Date(gridStart)
    for (let w = 0; w < 6; w++) {
        const week: CalendarDay[] = []
        for (let d = 0; d < 7; d++) {
            const date = new Date(cursor)
            const key = toDateKey(date)
            week.push({ date, key, inCurrentMonth: date.getMonth() === month, isToday: key === todayKey })
            cursor.setDate(cursor.getDate() + 1)
        }
        weeks.push(week)
    }
    return weeks
}

export function monthLabel(year: number, month: number): string {
    return new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

// The year/month that is `delta` months from the given one (delta may be negative).
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
    const d = new Date(year, month + delta, 1)
    return { year: d.getFullYear(), month: d.getMonth() }
}
