import {
    scopeGoals, goalCounts, activeGoals, archivedGoals, buildUpcomingRows, buildCompletedRows,
    formatGoalValue, daysLeftLabel, goalPercent, goalTarget, overallPercent, buildTimelineOutlook,
} from '@/lib/goalsView'
import type { Goal } from '@/lib/types/goals'

function goal(over: Partial<Goal>): Goal {
    return {
        id: 'proj_signups', category: 'growth', title: 'Signups', metricKey: 'signups', icon: 'user-plus',
        currentValue: 3, achievedCount: 1, tierCount: 4, maxThreshold: 100000, state: 'active',
        tiers: [
            { tierIndex: 0, threshold: 5, label: '5', achieved: true, state: 'completed', estimateDays: 21, activatedAt: '2026-06-01T00:00:00Z', targetDate: '2026-06-22T00:00:00Z', completedAt: '2026-06-20T00:00:00Z', daysLeft: null },
            { tierIndex: 1, threshold: 10, label: '10', achieved: false, state: 'active', estimateDays: 30, activatedAt: '2026-06-20T00:00:00Z', targetDate: '2026-07-20T00:00:00Z', completedAt: null, daysLeft: 15 },
            { tierIndex: 2, threshold: 10000, label: '10k', achieved: false, state: 'upcoming', estimateDays: 120, activatedAt: null, targetDate: null, completedAt: null, daysLeft: null },
            { tierIndex: 3, threshold: 100000, label: '100k', achieved: false, state: 'upcoming', estimateDays: 240, activatedAt: null, targetDate: null, completedAt: null, daysLeft: null },
        ],
        nextTier: { tierIndex: 1, threshold: 10, label: '10' },
        activeTier: { tierIndex: 1, threshold: 10, label: '10', estimateDays: 30, activatedAt: '2026-06-20T00:00:00Z', targetDate: '2026-07-20T00:00:00Z', daysLeft: 15 },
        activatedAt: '2026-06-20T00:00:00Z', targetDate: '2026-07-20T00:00:00Z',
        milestones: [{ tierIndex: 0, label: '5', threshold: 5, achievedAt: '2026-06-20T00:00:00Z', activatedAt: '2026-06-01T00:00:00Z', targetDate: '2026-06-22T00:00:00Z' }],
        ...over,
    }
}

const doneGoal = goal({
    id: 'acct_team', title: 'Team', metricKey: 'teammates_invited', state: 'completed', achievedCount: 2, tierCount: 2,
    tiers: [
        { tierIndex: 0, threshold: 1, label: '1', achieved: true, state: 'completed', estimateDays: 7, activatedAt: '2026-06-01T00:00:00Z', targetDate: '2026-06-08T00:00:00Z', completedAt: '2026-06-05T00:00:00Z', daysLeft: null },
        { tierIndex: 1, threshold: 5, label: '5', achieved: true, state: 'completed', estimateDays: 30, activatedAt: '2026-06-05T00:00:00Z', targetDate: '2026-07-05T00:00:00Z', completedAt: '2026-06-30T00:00:00Z', daysLeft: null },
    ],
    nextTier: null, activeTier: null, activatedAt: null, targetDate: null,
    milestones: [
        { tierIndex: 0, label: '1', threshold: 1, achievedAt: '2026-06-05T00:00:00Z', activatedAt: '2026-06-01T00:00:00Z', targetDate: '2026-06-08T00:00:00Z' },
        { tierIndex: 1, label: '5', threshold: 5, achievedAt: '2026-06-30T00:00:00Z', activatedAt: '2026-06-05T00:00:00Z', targetDate: '2026-07-05T00:00:00Z' },
    ],
})

describe('goalsView', () => {
    it('treats exactly one tier per group as active', () => {
        const scoped = scopeGoals([goal({})], 'project', 'Alpha')
        const active = activeGoals(scoped)
        expect(active).toHaveLength(1)
        expect(active[0].goal.activeTier?.threshold).toBe(10)
        // The active tier is the only one in the active state.
        expect(goal({}).tiers.filter(t => t.state === 'active')).toHaveLength(1)
    })

    it('lists upcoming milestones as locked behind the prior tier — no fabricated dates', () => {
        const rows = buildUpcomingRows(scopeGoals([goal({})], 'project', 'Alpha'))
        // Two upcoming tiers (10k, 100k), never the active one.
        expect(rows.map(r => r.threshold)).toEqual([10000, 100000])
        // Each is locked behind the tier before it: 10k after the active 10, 100k after 10k.
        expect(rows.map(r => r.afterLabel)).toEqual(['10', '10k'])
        // The estimate is exposed, but no committed start date is invented.
        expect(rows[0].estimateDays).toBe(120)
        expect(rows[0]).not.toHaveProperty('projectedStart')
    })

    it('lists completed milestones most recent first', () => {
        const rows = buildCompletedRows(scopeGoals([doneGoal], 'account', 'Portfolio'))
        expect(rows.map(r => r.label)).toEqual(['5', '1'])
        expect(rows[0].completedAt.slice(0, 10)).toBe('2026-06-30')
    })

    it('classifies fully-completed groups as archived, and counts states', () => {
        const scoped = [
            ...scopeGoals([goal({})], 'project', 'Alpha'),
            ...scopeGoals([doneGoal], 'account', 'Portfolio'),
        ]
        expect(archivedGoals(scoped).map(s => s.goal.id)).toEqual(['acct_team'])
        const counts = goalCounts(scoped)
        expect(counts.active).toBe(1)
        expect(counts.archived).toBe(1)
        expect(counts.upcoming).toBe(2)
        expect(counts.completed).toBe(1 + 2)
    })

    it('computes overall completion for the donut', () => {
        const scoped = [
            ...scopeGoals([goal({})], 'project', 'Alpha'),   // 4 tiers, 1 completed
            ...scopeGoals([doneGoal], 'account', 'Portfolio'), // 2 tiers, 2 completed
        ]
        // 3 completed of 6 total = 50%.
        expect(overallPercent(goalCounts(scoped))).toBe(50)
    })

    it('shows only real active targets in the outlook — locked upcoming tiers are excluded', () => {
        const outlook = buildTimelineOutlook(scopeGoals([goal({})], 'project', 'Alpha'))
        // Only the active target has a committed date; locked upcoming tiers are omitted.
        expect(outlook).toHaveLength(1)
        expect(outlook[0]).toMatchObject({ kind: 'active', date: expect.stringContaining('2026-07-20') })
    })

    it('formats values and countdowns for the UI', () => {
        expect(formatGoalValue('signups', 6432)).toBe('6,432')
        expect(formatGoalValue('mrr_cents', 624200)).toBe('$6,242')
        expect(daysLeftLabel(15)).toBe('15 days left')
        expect(daysLeftLabel(-3)).toBe('3 days over')
        expect(daysLeftLabel(null)).toBeNull()
        expect(goalPercent(goal({ currentValue: 3 }))).toBe(30) // 3 / 10
    })

    it('measures product setup against the full step count, consistently everywhere', () => {
        // Regression: the goals page and the dashboard widget used to divide by
        // different denominators for setup_steps (active-tier threshold vs the
        // full step count), so the same goal showed two percentages. goalTarget /
        // goalPercent are now the single source of truth: 2 of 4 steps => 50%.
        const setup = goal({
            metricKey: 'setup_steps', currentValue: 2, tierCount: 4,
            activeTier: { tierIndex: 2, threshold: 3, label: '3', estimateDays: 7, activatedAt: null, targetDate: null, daysLeft: null },
            nextTier: { tierIndex: 2, threshold: 3, label: '3' },
        })
        expect(goalTarget(setup)).toBe(4)      // full step count, not the next tier (3)
        expect(goalPercent(setup)).toBe(50)    // 2 / 4, not 2 / 3 (67%)
    })
})
