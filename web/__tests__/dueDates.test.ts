import { dueStatus, dueLabel, duePillClass, daysUntil } from '@/lib/dueDates'

describe('due-date helpers', () => {
    const now = new Date('2026-06-20T12:00:00')

    it('measures whole calendar days regardless of time of day', () => {
        expect(daysUntil('2026-06-20', now)).toBe(0)
        expect(daysUntil('2026-06-23', now)).toBe(3)
        expect(daysUntil('2026-06-18', now)).toBe(-2)
    })

    it('classifies overdue / due soon / upcoming and ignores done', () => {
        expect(dueStatus('2026-06-18', 'todo', now)).toBe('overdue')
        expect(dueStatus('2026-06-22', 'in_progress', now)).toBe('due_soon')
        expect(dueStatus('2026-06-20', 'todo', now)).toBe('due_soon') // today counts as due soon
        expect(dueStatus('2026-07-30', 'todo', now)).toBe('upcoming')
        expect(dueStatus('2026-06-18', 'done', now)).toBe('none') // done = no urgency
        expect(dueStatus(null, 'todo', now)).toBe('none')
    })

    it('labels relative dates', () => {
        expect(dueLabel('2026-06-20', 'todo', now)).toBe('Due today')
        expect(dueLabel('2026-06-21', 'todo', now)).toBe('Due tomorrow')
        expect(dueLabel('2026-06-18', 'todo', now)).toMatch(/^Overdue/)
    })

    it('colors pills by urgency', () => {
        expect(duePillClass('overdue')).toContain('--color-error')
        expect(duePillClass('due_soon')).toContain('--color-warning')
        expect(duePillClass('upcoming')).toContain('--color-text-muted')
    })
})
