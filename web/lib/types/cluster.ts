// Unified cluster shape matching the backend `clusters` table. The dashboard
// (`/clusters/trending`, `/dashboard/signals`) and cluster detail (`/clusters/{id}`)
// all return a subset of these fields.
export interface Cluster {
    id: number
    name: string | null
    summary?: string | null
    signalScore: number | null
    trending: boolean | null
    postCount: number | null
    authorCount?: number | null
    communityCount?: number | null
    firstSeen?: string | null
    lastSeenDate?: string | null
    sourceBreakdown?: { platform?: string; count: number; percentage?: number }[] | null
    postVolumeByDate?: { date: string; count: number }[] | null
    // Primary opportunity classification (singular columns live on cluster_items;
    // the cluster detail rolls up a representative value).
    opportunityType?: string | null
    opportunityDomain?: string | null
}

// A single source post belonging to a cluster (`cluster_items` table).
export interface ClusterItem {
    id: number
    clusterId: number
    platform: string | null
    community: string | null
    title: string | null
    body: string | null
    url: string | null
    permalink: string | null
    author: string | null
    score: number | null
    upvoteRatio: number | null
    numComments: number | null
    postedAt: string | null
    opportunityType: string | null
    opportunityDomain: string | null
    similarityScore: number | null
    problemStatement: string | null
    solutionAngle: string | null
    signalScore?: number | null
}

// ──────────────────────────────────────────────────────────────────────────
// Pipeline board (the user's saved cluster cards). Trimmed to the fields the
// board actually renders and the backend `/pipeline` endpoint returns; the
// old standalone-opportunity enrichment has been removed.
// ──────────────────────────────────────────────────────────────────────────
export type PipelineStage = 'watching' | 'discovery' | 'exploring' | 'validating' | 'building'

export interface PipelineStageEvent {
    stage: string
    enteredAt: string
}

// The backend model currently declares active / paused / killed, while the
// lifecycle UI also persists sunsetting / retired through the pipeline PATCH
// endpoint. Keep the effective contract explicit until the API validates it.
export const PORTFOLIO_PRODUCT_STATUSES = ['active', 'paused', 'sunsetting', 'retired', 'killed'] as const
export type PortfolioProductStatus = typeof PORTFOLIO_PRODUCT_STATUSES[number]

export interface ClusterMetrics {
    avgSourceScore: number | null
    coherenceScore: number | null
    postCount: number
}

export interface PipelinePost {
    id: string
    title: string
    sourceScore: number | null
}

export interface PipelineCard {
    id: string
    name: string
    // User-given project name; `displayName` is the effective title to show
    // (projectName falling back to the cluster `name`).
    projectName?: string | null
    displayName?: string
    iconUrl?: string | null
    notes?: string | null
    // Kept string-shaped to match the current permissive PATCH response. The
    // Portfolio UI narrows it through PORTFOLIO_PRODUCT_STATUSES at its boundary.
    status?: string
    // Optional launch timeline (Phase 1).
    timelineDays?: number | null
    timelineStart?: string | null
    timelineTargetLaunch?: string | null
    // Ordered stage history (from GET /pipeline/{id}) so the Timeline can
    // decompose the launch journey into real stage durations.
    stageEvents?: PipelineStageEvent[] | null
    teamId: string | null
    team: { id: string; name: string; description: string | null } | null
    postIds: string[]
    sourceClusterId: string | null
    stage: PipelineStage
    killCriteria: string | null
    distributionChannels: string[]
    url?: string | null
    outcome?: string | null
    mrr?: number | null
    clusterMetrics: ClusterMetrics | null
    posts: PipelinePost[]
    launchedAt: string | null
    removedAt: string | null
    createdAt: string
    updatedAt: string | null
    openIssueCount: number
    openKillCriteriaCount: number
}
