// Pure, testable helpers that turn the backend goal payload into the Active /
// Upcoming / Completed / Archived views the Goals page renders.
//
// Product rule: a goal's clock starts only when it becomes active. Active and
// completed tiers carry real dates from the backend; upcoming tiers get a *soft*
// projected start here (chained from the active goal's target), never a deadline.

import type { Goal } from '@/lib/types/goals'

// UI-friendly names keyed by the stable metric key (mirrors GoalsCards).
const GOAL_LABELS: Record<string, string> = {
    signups: 'New signups',
    mrr_cents: 'Monthly revenue',
    traffic: 'Pageviews',
    setup_steps: 'Product setup',
    issues_created: 'Issue tracking',
    products_launched: 'Products launched',
    problems_created: 'Problems discovered',
    tasks_created: 'Tasks created',
    teammates_invited: 'Teammates invited',
}

export function goalDisplayName(goal: Goal): string {
    return GOAL_LABELS[goal.metricKey] ?? goal.title
}

// Friendly, plain-language phrasing for reaching a tier — "Define 5 problems",
// "Earn your first dollar" — instead of database-y "target 1/4" / "First $".
// Used by the goal cards and the month calendar so the copy reads like a to-do.
export function goalTargetPhrase(metricKey: string, threshold: number, tierLabel: string): string {
    const first = threshold <= 1
    switch (metricKey) {
        case 'signups': return `Reach ${threshold.toLocaleString()} signups`
        case 'traffic': return `Reach ${threshold.toLocaleString()} pageviews`
        case 'mrr_cents': return first ? 'Earn your first dollar' : `Reach ${formatGoalValue('mrr_cents', threshold)} monthly revenue`
        case 'setup_steps': return `Complete ${threshold} of 4 setup steps`
        case 'issues_created': return first ? 'Track your first issue' : `Track ${threshold} issues`
        case 'problems_defined': return first ? 'Define your first problem' : `Define ${threshold} problems`
        case 'features_defined': return first ? 'Define your first feature' : `Define ${threshold} features`
        case 'features_built': return first ? 'Build your first feature' : `Build ${threshold} features`
        case 'products_launched': return first ? 'Launch your first product' : `Launch ${threshold} products`
        case 'problems_created': return first ? 'Discover your first problem' : `Discover ${threshold} problems`
        case 'tasks_created': return first ? 'Create your first task' : `Create ${threshold} tasks`
        case 'teammates_invited': return first ? 'Invite your first teammate' : `Invite ${threshold} teammates`
        default: return `Reach ${tierLabel}`
    }
}

// Format a metric value for display: revenue in dollars, everything else as a
// plain count.
export function formatGoalValue(metricKey: string, value: number): string {
    if (metricKey === 'mrr_cents') return `$${Math.round(value / 100).toLocaleString()}`
    return value.toLocaleString()
}

export function formatGoalDate(iso: string | null): string {
    if (!iso) return '—'
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Human countdown for an active goal; null when there's no live clock.
export function daysLeftLabel(daysLeft: number | null): string | null {
    if (daysLeft == null) return null
    if (daysLeft < 0) return `${Math.abs(daysLeft)} days over`
    if (daysLeft === 0) return 'Due today'
    return `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
}

const SETUP_METRIC = 'setup_steps'

// The denominator progress is measured against: for product setup it's the full
// step count (so "2 of 4 steps" reads as 50%), otherwise the active tier's
// threshold. Single source of truth so the goals page and the dashboard widget
// never show the same goal at two different percentages.
export function goalTarget(goal: Goal): number {
    if (goal.metricKey === SETUP_METRIC) return goal.tierCount ?? goal.tiers?.length ?? 0
    return goal.activeTier?.threshold ?? goal.maxThreshold
}

// Percent toward the goal's target; 100 once the group is complete.
export function goalPercent(goal: Goal): number {
    if (!goal.activeTier) return 100
    const target = goalTarget(goal)
    return target > 0 ? Math.min(100, Math.round((goal.currentValue / target) * 100)) : 0
}

export type GoalScope = 'account' | 'project'

export interface ScopedGoal {
    goal: Goal
    scope: GoalScope
    scopeLabel: string
}

// Tag each goal with its scope so account (portfolio-wide) and project goals can
// coexist on one page while staying visually distinct.
export function scopeGoals(goals: Goal[], scope: GoalScope, scopeLabel: string): ScopedGoal[] {
    return goals.map(goal => ({ goal, scope, scopeLabel }))
}

export interface GoalCounts {
    active: number
    upcoming: number
    completed: number
    archived: number
    total: number
}

export function goalCounts(scoped: ScopedGoal[]): GoalCounts {
    let active = 0, upcoming = 0, completed = 0, archived = 0, total = 0
    for (const { goal } of scoped) {
        total += goal.tierCount
        completed += goal.achievedCount
        upcoming += goal.tiers.filter(t => t.state === 'upcoming').length
        if (goal.activeTier) active += 1
        else archived += 1
    }
    return { active, upcoming, completed, archived, total }
}

// Goals with a live active milestone, and fully-completed (archived) groups.
export function activeGoals(scoped: ScopedGoal[]): ScopedGoal[] {
    return scoped.filter(s => s.goal.state === 'active' && s.goal.activeTier)
}

export function archivedGoals(scoped: ScopedGoal[]): ScopedGoal[] {
    return scoped.filter(s => s.goal.state === 'completed')
}

export interface UpcomingRow {
    key: string
    scope: GoalScope
    scopeLabel: string
    goalName: string
    category: string
    metricKey: string
    label: string
    threshold: number
    estimateDays: number
    // The tier this one is locked behind — its clock starts only once that tier
    // completes, so we surface "starts after {afterLabel}" instead of inventing a
    // calendar date the system can't actually commit to.
    afterLabel: string
}

// The next milestones per active group, each shown as locked behind the tier
// before it (the active tier first, then the prior upcoming). We deliberately do
// not project a start date: a locked tier's clock begins only when the previous
// tier is actually completed.
export function buildUpcomingRows(scoped: ScopedGoal[]): UpcomingRow[] {
    const rows: UpcomingRow[] = []
    for (const { goal, scope, scopeLabel } of scoped) {
        if (goal.state !== 'active' || !goal.activeTier) continue
        let afterLabel = goal.activeTier.label
        const upcoming = goal.tiers.filter(t => t.state === 'upcoming').sort((a, b) => a.tierIndex - b.tierIndex)
        for (const tier of upcoming) {
            rows.push({
                key: `${goal.id}-${tier.tierIndex}`,
                scope,
                scopeLabel,
                goalName: goalDisplayName(goal),
                category: goal.category,
                metricKey: goal.metricKey,
                label: tier.label,
                threshold: tier.threshold,
                estimateDays: tier.estimateDays,
                afterLabel,
            })
            afterLabel = tier.label
        }
    }
    return rows
}

// Overall completion across every tier in view (completed / total).
export function overallPercent(counts: GoalCounts): number {
    return counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0
}

export interface OutlookEntry {
    key: string
    date: string
    name: string
    label: string
    kind: 'active' | 'upcoming'
    daysLeft: number | null
}

// A chronological "what's ahead" list for the Timeline Outlook rail: active goals
// at their live target date, sorted soonest-first and capped. Upcoming tiers are
// intentionally excluded — they are locked and have no committed date, so listing
// them would reintroduce the fabricated-deadline problem.
export function buildTimelineOutlook(scoped: ScopedGoal[], limit = 6): OutlookEntry[] {
    const entries: OutlookEntry[] = []
    for (const { goal } of activeGoals(scoped)) {
        const tier = goal.activeTier
        if (tier?.targetDate) {
            entries.push({ key: `a-${goal.id}`, date: tier.targetDate, name: goalDisplayName(goal), label: tier.label, kind: 'active', daysLeft: tier.daysLeft })
        }
    }
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    return entries.slice(0, limit)
}

export interface CompletedRow {
    key: string
    scope: GoalScope
    scopeLabel: string
    goalName: string
    category: string
    metricKey: string
    label: string
    threshold: number
    activatedAt: string | null
    targetDate: string | null
    completedAt: string
}

// The achieved milestones across all goals, most recent first.
export function buildCompletedRows(scoped: ScopedGoal[]): CompletedRow[] {
    const rows: CompletedRow[] = []
    for (const { goal, scope, scopeLabel } of scoped) {
        for (const m of goal.milestones) {
            rows.push({
                key: `${goal.id}-${m.tierIndex}`,
                scope,
                scopeLabel,
                goalName: goalDisplayName(goal),
                category: goal.category,
                metricKey: goal.metricKey,
                label: m.label,
                threshold: m.threshold,
                activatedAt: m.activatedAt,
                targetDate: m.targetDate,
                completedAt: m.achievedAt,
            })
        }
    }
    rows.sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    return rows
}
