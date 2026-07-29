import {
    TIMELINE_OPTIONS,
    timelineMilestones,
    timelineProgress,
    phaseBarClass,
    DISCOVERY_FRACTION,
} from '@/lib/timeline'

const DAY_MS = 24 * 60 * 60 * 1000

describe('timeline helpers', () => {
    it('offers the four Phase 1 windows', () => {
        expect(TIMELINE_OPTIONS.map(o => o.days)).toEqual([14, 30, 60, 90])
    })

    it('splits the window 30/70 for discovery vs build milestones', () => {
        const start = new Date('2026-06-01T00:00:00Z')
        const { discoveryEnd, launchTarget } = timelineMilestones(start, 30)
        expect(discoveryEnd.getTime()).toBe(start.getTime() + 30 * DISCOVERY_FRACTION * DAY_MS)
        expect(launchTarget.getTime()).toBe(start.getTime() + 30 * DAY_MS)
    })

    it('reports the discovery phase early in the window', () => {
        const start = '2026-06-01T00:00:00Z'
        const now = new Date('2026-06-03T00:00:00Z') // day 3 of 30 (< 30%)
        const p = timelineProgress(start, 30, null, now)
        expect(p.phase).toBe('discovery')
        expect(p.phaseLabel).toBe('Discovery Phase')
        expect(p.dayX).toBe(3)
        expect(p.totalDays).toBe(30)
        expect(p.overdue).toBe(false)
        expect(p.percent).toBeCloseTo((2 / 30) * 100)
        expect(phaseBarClass(p.phase)).toBe('bg-(--color-text)')
    })

    it('reports the build phase past the 30% mark', () => {
        const start = '2026-06-01T00:00:00Z'
        const now = new Date('2026-06-20T00:00:00Z') // day 20 of 30 (> 30%)
        const p = timelineProgress(start, 30, null, now)
        expect(p.phase).toBe('build')
        expect(p.phaseLabel).toBe('Build Phase')
        expect(phaseBarClass(p.phase)).toBe('bg-(--color-accent)')
    })

    it('flags overdue projects in amber without launching', () => {
        const start = '2026-06-01T00:00:00Z'
        const now = new Date('2026-07-15T00:00:00Z') // past day 30
        const p = timelineProgress(start, 30, null, now)
        expect(p.overdue).toBe(true)
        expect(p.phase).toBe('overdue')
        expect(p.phaseLabel).toBe('Past target launch date')
        expect(p.percent).toBe(100)
        expect(p.dayX).toBe(30)
        expect(phaseBarClass(p.phase)).toBe('bg-(--color-error)')
    })

    it('treats a launched project as complete, never overdue', () => {
        const start = '2026-06-01T00:00:00Z'
        const now = new Date('2026-07-15T00:00:00Z')
        const p = timelineProgress(start, 30, '2026-06-10T00:00:00Z', now)
        expect(p.launched).toBe(true)
        expect(p.overdue).toBe(false)
        expect(p.percent).toBe(100)
    })
})
