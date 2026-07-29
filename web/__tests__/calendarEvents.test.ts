import { buildEvents, buildWorkspaceEvents, taskDotClass, type CalendarTask } from '@/lib/calendarEvents'
import type { PipelineCard } from '@/lib/types/cluster'
import type { Goal } from '@/lib/types/goals'

function card(extra: Partial<PipelineCard>): PipelineCard {
    return { timelineStart: '2026-06-01', timelineDays: 30, timelineTargetLaunch: '2026-07-01', launchedAt: null, ...extra } as PipelineCard
}

function goal(extra: Partial<Goal>): Goal {
    return {
        id: 'proj_signups', category: 'growth', title: 'Signups', metricKey: 'signups', icon: 'user-plus',
        currentValue: 3, achievedCount: 1, tierCount: 3, maxThreshold: 100, state: 'active',
        tiers: [],
        nextTier: { tierIndex: 1, threshold: 10, label: '10' },
        activeTier: { tierIndex: 1, threshold: 10, label: '10', estimateDays: 30, activatedAt: '2026-06-10T00:00:00Z', targetDate: '2026-07-10T00:00:00Z', daysLeft: 20 },
        activatedAt: '2026-06-10T00:00:00Z', targetDate: '2026-07-10T00:00:00Z',
        milestones: [{ tierIndex: 0, label: '5', threshold: 5, achievedAt: '2026-06-10T00:00:00Z', activatedAt: '2026-06-01T00:00:00Z', targetDate: '2026-06-22T00:00:00Z' }],
        ...extra,
    }
}

function task(extra: Partial<CalendarTask>): CalendarTask {
    return { id: 't1', title: 'Task', status: 'todo', dueDate: null, ...extra }
}

describe('taskDotClass', () => {
    it('is success when the task is done', () => {
        expect(taskDotClass(task({ status: 'done', dueDate: '2020-01-01' }))).toBe('bg-(--color-success)')
    })
    it('is error when overdue and not done', () => {
        expect(taskDotClass(task({ status: 'todo', dueDate: '2000-01-01' }))).toBe('bg-(--color-error)')
    })
})

describe('buildEvents', () => {
    it('places timeline milestones on their day keys', () => {
        const events = buildEvents([], card({}))
        expect(events['2026-06-01']?.map(e => e.label)).toContain('Project start')
        // Build begins after 30% of 30 days = 9 days → June 10.
        expect(events['2026-06-10']?.map(e => e.label)).toContain('Build begins')
        expect(events['2026-07-01']?.map(e => e.label)).toContain('Launch target')
    })

    it('adds a Launched milestone when the project has launched', () => {
        const events = buildEvents([], card({ launchedAt: '2026-06-20' }))
        expect(events['2026-06-20']?.map(e => e.label)).toContain('Launched')
    })

    it('keys task due dates with a status-based dot', () => {
        const events = buildEvents([task({ title: 'Ship it', dueDate: '2026-06-15' })], null)
        expect(events['2026-06-15']?.[0]).toMatchObject({ label: 'Ship it' })
    })

    it('returns no milestones without a timeline', () => {
        expect(buildEvents([], null)).toEqual({})
    })

    it('adds active-goal target and reached-milestone events with friendly copy', () => {
        const events = buildEvents([], null, [goal({})])
        // Active milestone's live target date, phrased as a to-do (type goal-target).
        expect(events['2026-07-10']?.map(e => [e.label, e.type])).toContainEqual(['Reach 10 signups', 'goal-target'])
        // Already-reached milestone (type milestone, completed).
        const reached = events['2026-06-10']?.find(e => e.type === 'milestone')
        expect(reached).toMatchObject({ label: 'Reach 5 signups', status: 'completed' })
    })

    it('combines project events and labels their source project', () => {
        const events = buildWorkspaceEvents([
            { card: card({ id: 'one', name: 'Alpha' }), tasks: [task({ title: 'Review', dueDate: '2026-06-15' })] },
            { card: card({ id: 'two', name: 'Beta' }), tasks: [task({ title: 'Ship', dueDate: '2026-06-15' })] },
        ])

        expect(events['2026-06-15']?.map(event => event.label)).toEqual(['Alpha: Review', 'Beta: Ship'])
    })
})
