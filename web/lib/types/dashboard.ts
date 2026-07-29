// Dashboard intelligence feed, sourced from GET /dashboard/signals.
export interface DashboardSignalCluster {
    id: number
    name: string | null
    summary: string | null
    signalScore: number | null
    trending: boolean | null
    postCount: number
}

export interface DomainBreakdownEntry {
    domain: string
    postCount: number
    clusterCount: number
}

export interface DashboardSignals {
    clusters: DashboardSignalCluster[]
    domainBreakdown: DomainBreakdownEntry[]
}

// Lightweight header counts, derived client-side from the signals payload.
export interface DashboardSummary {
    clustersTracked: number
    domainsTracked: number
}

// Momentum movers, sourced from GET /dashboard/movers.
export interface MomentumMover {
    id: number
    name: string | null
    momentum30d: number | null
    momentum7d: number | null
    signalScore: number | null
    postCount: number
    trending: boolean | null
}

export interface DashboardMovers {
    risers: MomentumMover[]
    fallers: MomentumMover[]
    available: boolean
}

// Authenticated workspace activity, from GET /dashboard/activity.
export interface ActivityDay {
    date: string
    count: number
}

export interface DashboardActivity {
    weeks: number
    days: ActivityDay[]
    windowActions: number
    windowLogins: number
    activeDays: number
    lastActivityAt: string | null
    trend: {
        current7d: number
        previous7d: number
        changePct: number | null
    }
}
