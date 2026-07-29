// Payload shape returned by the backend goals endpoints
// (GET /api/portfolio/goals and /api/portfolio/{id}/goals).

// A goal's clock starts only when it becomes active: completed and active tiers
// carry activation/target dates; upcoming tiers expose only their estimate.
export type GoalTierState = 'completed' | 'active' | 'upcoming'

export interface GoalTierView {
    tierIndex: number
    threshold: number
    label: string
    achieved: boolean
    state: GoalTierState
    estimateDays: number
    activatedAt: string | null
    targetDate: string | null
    completedAt: string | null
    daysLeft: number | null
}

export interface GoalMilestone {
    tierIndex: number
    label: string
    threshold: number
    achievedAt: string
    activatedAt: string | null
    targetDate: string | null
}

export interface GoalNextTier {
    tierIndex: number
    threshold: number
    label: string
}

export interface GoalActiveTier {
    tierIndex: number
    threshold: number
    label: string
    estimateDays: number
    activatedAt: string | null
    targetDate: string | null
    daysLeft: number | null
}

export type GoalState = 'active' | 'completed'

export interface Goal {
    id: string
    category: string
    title: string
    metricKey: string
    icon: string
    currentValue: number
    achievedCount: number
    tierCount: number
    maxThreshold: number
    state: GoalState
    tiers: GoalTierView[]
    nextTier: GoalNextTier | null
    activeTier: GoalActiveTier | null
    activatedAt: string | null
    targetDate: string | null
    milestones: GoalMilestone[]
}
