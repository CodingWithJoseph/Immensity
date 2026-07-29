import { buildTimelineModel, buildAccountTimelineModel, positionPercent, axisTicks } from '@/lib/timelineView'
import type { PipelineCard } from '@/lib/types/cluster'
import type { Goal } from '@/lib/types/goals'
import type { CalendarTask } from '@/lib/calendarEvents'

const NOW = new Date('2026-07-08T12:00:00Z')

function card(extra: Partial<PipelineCard>): PipelineCard {
    return { timelineStart: '2026-06-01', timelineDays: 30, timelineTargetLaunch: '2026-07-01', launchedAt: null, ...extra } as PipelineCard
}

function goal(extra: Partial<Goal>): Goal {
    return {
        id: 'proj_signups', category: 'growth', title: 'Signups', metricKey: 'signups', icon: 'user-plus',
        currentValue: 6, achievedCount: 1, tierCount: 3, maxThreshold: 100, state: 'active',
        tiers: [
            { tierIndex: 0, threshold: 5, label: '5', achieved: true, state: 'completed', estimateDays: 21, activatedAt: '2026-06-01T00:00:00Z', targetDate: '2026-06-22T00:00:00Z', completedAt: '2026-06-20T00:00:00Z', daysLeft: null },
            { tierIndex: 1, threshold: 10, label: '10', achieved: false, state: 'active', estimateDays: 30, activatedAt: '2026-06-20T00:00:00Z', targetDate: '2026-07-20T00:00:00Z', completedAt: null, daysLeft: 12 },
            { tierIndex: 2, threshold: 100, label: '100', achieved: false, state: 'upcoming', estimateDays: 60, activatedAt: null, targetDate: null, completedAt: null, daysLeft: null },
        ],
        nextTier: { tierIndex: 1, threshold: 10, label: '10' },
        activeTier: { tierIndex: 1, threshold: 10, label: '10', estimateDays: 30, activatedAt: '2026-06-20T00:00:00Z', targetDate: '2026-07-20T00:00:00Z', daysLeft: 12 },
        activatedAt: '2026-06-20T00:00:00Z', targetDate: '2026-07-20T00:00:00Z',
        milestones: [{ tierIndex: 0, label: '5', threshold: 5, achievedAt: '2026-06-20T00:00:00Z', activatedAt: '2026-06-01T00:00:00Z', targetDate: '2026-06-22T00:00:00Z' }],
        ...extra,
    }
}

function task(extra: Partial<CalendarTask>): CalendarTask {
    return { id: 't1', title: 'Task', status: 'todo', dueDate: null, ...extra }
}

const day = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).getTime() }

describe('buildTimelineModel', () => {
    it('builds Discovery/Build phase bands and a launch-target mark (no launch lane)', () => {
        const model = buildTimelineModel(card({}), [], [], NOW)
        expect(model.lanes.find(l => l.id === 'launch')).toBeUndefined()
        expect(model.phases.map(p => p.tone)).toEqual(['discovery', 'overdue']) // past 2026-07-01 target, not launched
        // Discovery spans start → start + 30% of 30 days (9 days) = Jun 10.
        expect(model.phases[0]).toMatchObject({ startMs: day('2026-06-01'), endMs: day('2026-06-10') })
        expect(model.phases[1].endMs).toBe(day('2026-07-01')) // build ends at target
        expect(model.launchMark).toMatchObject({ tone: 'target-overdue', atMs: day('2026-07-01') })
    })

    it('decomposes phases into real stage bands when stage history is present', () => {
        const withStages = card({
            stageEvents: [
                { stage: 'watching', enteredAt: '2026-06-01T00:00:00Z' },
                { stage: 'exploring', enteredAt: '2026-06-10T00:00:00Z' },
                { stage: 'building', enteredAt: '2026-06-25T00:00:00Z' },
            ],
        })
        const model = buildTimelineModel(withStages, [], [], NOW)
        expect(model.phases.map(p => p.label)).toEqual(['Watching', 'Exploring', 'Building'])
        expect(model.phases[0]).toMatchObject({ startMs: day('2026-06-01'), endMs: day('2026-06-10'), tone: 'discovery' })
        expect(model.phases[1]).toMatchObject({ startMs: day('2026-06-10'), endMs: day('2026-06-25') })
        // Building is the run-up to launch (accent) and, un-launched, runs to today.
        expect(model.phases[2]).toMatchObject({ tone: 'build', startMs: day('2026-06-25'), endMs: NOW.getTime() })
        expect(model.launchMark!.tone).toBe('target-overdue')
    })

    it('caps the Build band at launch and marks it Launched once launched', () => {
        const model = buildTimelineModel(card({ launchedAt: '2026-06-28' }), [], [], NOW)
        expect(model.phases[1].tone).toBe('build')
        expect(model.phases[1].endMs).toBe(day('2026-06-28'))
        expect(model.launchMark).toMatchObject({ tone: 'launched', atMs: day('2026-06-28') })
    })

    it('expresses the goal lifecycle: done marker, an active bar, a target diamond with countdown chip, and a muted next tier', () => {
        const model = buildTimelineModel(null, [goal({})], [], NOW)
        const lane = model.lanes.find(l => l.id === 'goal-proj_signups')!
        expect(lane.label).toBe('New signups')
        // Active bar Jun 20 -> Jul 20, no inline countdown text (that lives on the marker chip).
        const active = lane.bars.find(b => b.tone === 'goal-active')!
        expect(active).toMatchObject({ startMs: day('2026-06-20'), endMs: day('2026-07-20') })
        expect(active).not.toHaveProperty('detail')
        // Markers: the reached milestone (Jun 20) and the active target diamond (Jul 20)
        // carrying the countdown as a chip.
        const done = lane.markers.find(m => m.tone === 'goal-done')!
        expect(done).toMatchObject({ atMs: day('2026-06-20') })
        const target = lane.markers.find(m => m.tone === 'goal-target')!
        expect(target).toMatchObject({ atMs: day('2026-07-20'), chip: { label: '12 days left', tone: 'muted' } })
        // Only the active tier is a real bar; the next tier is a muted projection
        // beginning at the active target and running its 60-day estimate.
        expect(lane.bars.filter(b => b.tone !== 'goal-active')).toHaveLength(0)
        expect(lane.softNext).toMatchObject({ label: '100', startMs: day('2026-07-20'), endMs: day('2026-07-20') + 60 * 86400000 })
    })

    it('exposes the full tier ladder as expandable sub-rows: completed / active / locked', () => {
        const lane = buildTimelineModel(null, [goal({})], [], NOW).lanes.find(l => l.id === 'goal-proj_signups')!
        const rows = lane.subRows!
        expect(rows.map(r => r.label)).toEqual(['5', '10', '100'])
        // Completed tier: a done-toned bar for its real duration + a reached marker.
        expect(rows[0].bars[0]).toMatchObject({ tone: 'goal-done', startMs: day('2026-06-01'), endMs: day('2026-06-20') })
        expect(rows[0].markers[0].tone).toBe('goal-done')
        // Active tier: its live bar and target diamond.
        expect(rows[1].bars[0]).toMatchObject({ tone: 'goal-active', endMs: day('2026-07-20') })
        expect(rows[1].markers[0].tone).toBe('goal-target')
        // Locked upcoming tier: no bar, just a "starts after" note.
        expect(rows[2].bars).toHaveLength(0)
        expect(rows[2].note).toBe('Locked · starts after 10')
    })

    it('marks an active goal overdue when its target has passed, with an error-toned target and chip', () => {
        const overdueGoal = goal({
            activeTier: { tierIndex: 1, threshold: 10, label: '10', estimateDays: 30, activatedAt: '2026-06-01T00:00:00Z', targetDate: '2026-07-01T00:00:00Z', daysLeft: -7 },
        })
        const lane = buildTimelineModel(null, [overdueGoal], [], NOW).lanes.find(l => l.id === 'goal-proj_signups')!
        expect(lane.bars.find(b => b.key.endsWith('-active'))!.tone).toBe('goal-overdue')
        const target = lane.markers.find(m => m.key.endsWith('-target'))!
        expect(target).toMatchObject({ tone: 'goal-target-overdue', chip: { label: '7 days over', tone: 'overdue' } })
    })

    it('places task due dates as markers toned by urgency, skipping tasks without a due date', () => {
        const tasks = [
            task({ id: 'a', title: 'Overdue', dueDate: '2026-07-01', status: 'todo' }),
            task({ id: 'b', title: 'Done', dueDate: '2026-07-02', status: 'done' }),
            task({ id: 'c', title: 'Soon', dueDate: '2026-07-10', status: 'todo' }),
            task({ id: 'd', title: 'No date', dueDate: null }),
        ]
        const lane = buildTimelineModel(null, [], tasks, NOW).lanes.find(l => l.id === 'tasks')!
        expect(lane.markers.map(m => [m.label, m.tone])).toEqual([
            ['Overdue', 'task-overdue'],
            ['Done', 'task-done'],
            ['Soon', 'task-due-soon'],
        ])
    })

    it('orders lanes goals → Tasks (launch is bands, not a lane) and spans all dated content plus today', () => {
        const model = buildTimelineModel(card({}), [goal({})], [task({ dueDate: '2026-07-10' })], NOW)
        expect(model.lanes.map(l => l.kind)).toEqual(['goal', 'tasks'])
        expect(model.phases.length).toBeGreaterThan(0)
        expect(model.empty).toBe(false)
        // Range brackets the earliest start (Jun 1) and latest dated point (the active
        // goal target Jul 20 — locked tiers add no dates), incl. today.
        expect(model.startMs).toBeLessThanOrEqual(day('2026-06-01'))
        expect(model.endMs).toBeGreaterThan(day('2026-07-20'))
        expect(model.nowMs).toBe(NOW.getTime())
    })

    it('is empty with a today-centred window when there is no dated content', () => {
        const model = buildTimelineModel(null, [], [], NOW)
        expect(model.empty).toBe(true)
        expect(model.lanes).toHaveLength(0)
        expect(model.startMs).toBeLessThan(NOW.getTime())
        expect(model.endMs).toBeGreaterThan(NOW.getTime())
    })
})

describe('buildAccountTimelineModel', () => {
    it('is a lane per account goal — no per-product launch lanes (those live in the project view)', () => {
        const model = buildAccountTimelineModel([goal({}), goal({ id: 'acct_launches', metricKey: 'products_launched' })], NOW)
        expect(model.lanes.map(l => l.id)).toEqual(['goal-proj_signups', 'goal-acct_launches'])
        expect(model.lanes.every(l => l.kind === 'goal')).toBe(true)
        expect(model.lanes.some(l => l.id.startsWith('product-'))).toBe(false)
        expect(model.empty).toBe(false)
    })

    it('is empty with a today-centred window when there are no account goals', () => {
        const model = buildAccountTimelineModel([], NOW)
        expect(model.empty).toBe(true)
        expect(model.lanes).toHaveLength(0)
        expect(model.startMs).toBeLessThan(NOW.getTime())
        expect(model.endMs).toBeGreaterThan(NOW.getTime())
    })
})

describe('positionPercent / axisTicks', () => {
    it('maps a timestamp to a clamped 0–100 position', () => {
        const s = day('2026-06-01'), e = day('2026-07-01')
        expect(positionPercent(s, s, e)).toBe(0)
        expect(positionPercent(e, s, e)).toBe(100)
        expect(Math.round(positionPercent(day('2026-06-16'), s, e))).toBe(50)
        expect(positionPercent(day('2026-05-01'), s, e)).toBe(0) // clamped
    })

    it('emits a tick at each month boundary in range', () => {
        const ticks = axisTicks(day('2026-06-15'), day('2026-09-05'))
        expect(ticks.map(t => new Date(t.ms).getMonth())).toEqual([6, 7, 8]) // Jul, Aug, Sep
    })
})
