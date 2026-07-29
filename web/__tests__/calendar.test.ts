import { toDateKey, addDaysToKey, buildMonthGrid, monthLabel, shiftMonth, WEEKDAY_LABELS } from '@/lib/calendar'

describe('calendar helpers', () => {
    it('keys a date as local YYYY-MM-DD', () => {
        expect(toDateKey(new Date(2026, 5, 1))).toBe('2026-06-01')
        expect(toDateKey(new Date(2026, 11, 9))).toBe('2026-12-09')
    })

    it('adds and subtracts whole days across month boundaries', () => {
        expect(addDaysToKey('2026-06-29', 3)).toBe('2026-07-02')
        expect(addDaysToKey('2026-06-01', -1)).toBe('2026-05-31')
        expect(addDaysToKey('2026-06-10', 9)).toBe('2026-06-19') // 30% of a 30-day window
    })

    it('builds a 6x7 grid starting on Sunday and flags the current month + today', () => {
        const today = new Date(2026, 5, 15)
        const weeks = buildMonthGrid(2026, 5, today) // June 2026
        expect(weeks).toHaveLength(6)
        expect(weeks.every(w => w.length === 7)).toBe(true)
        // June 1 2026 is a Monday, so the grid starts on Sun May 31.
        expect(weeks[0][0].key).toBe('2026-05-31')
        expect(weeks[0][0].inCurrentMonth).toBe(false)
        expect(weeks[0][1].key).toBe('2026-06-01')
        expect(weeks[0][1].inCurrentMonth).toBe(true)
        const todayCell = weeks.flat().find(d => d.isToday)
        expect(todayCell?.key).toBe('2026-06-15')
    })

    it('labels months and shifts across year boundaries', () => {
        expect(monthLabel(2026, 5)).toMatch(/June 2026/)
        expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 })
        expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 })
    })

    it('exposes seven weekday labels', () => {
        expect(WEEKDAY_LABELS).toHaveLength(7)
        expect(WEEKDAY_LABELS[0]).toBe('Sun')
    })
})
