import type { PipelineStage } from '@/lib/types/cluster'

export type Momentum = 'growing' | 'steady' | 'fading'
export type SignalMode = 'cluster' | 'forming' | 'singleton' | 'custom'
export type SignalStatus = 'ready' | 'generated' | 'pending' | 'processing' | 'stale' | 'failed' | 'missing' | 'partial' | 'singleton'

export interface SignalCompleteness {
    score: boolean
    momentum: boolean
    volume: boolean
    evidence: boolean
    sources: boolean
    itemCount: boolean
}

export interface SignalWeeklyVolume {
    week: string
    count: number
}

export interface SignalTopProblemStatement {
    id?: string | number | null
    postId?: string | number | null
    post_id?: string | number | null
    title?: string | null
    problemStatement?: string | null
    problem_statement?: string | null
    score?: number | null
}

export interface SignalPayload {
    mode: SignalMode
    status: SignalStatus
    score: number | null
    recency: number | null
    momentum7d: number | null
    momentum30d: number | null
    momentum90d: number | null
    postVolumeByWeek: SignalWeeklyVolume[]
    totalPosts: number
    authorCount: number | null
    communityCount: number | null
    platformCount: number | null
    sourceCommunities: string[]
    avgComments: number | null
    avgVotes: number | null
    topProblemStatements: SignalTopProblemStatement[]
    generatedAt: string | null
    lastError: string | null
    inputFingerprint: string | null
    completeness: SignalCompleteness
}

// Phase 3 flat contract returned by GET /api/pipeline/{id}/signal — the real
// cluster_signals payload. Replaces the nested SignalWorkspace.signal envelope.
// Matches the Supabase cluster_signal_status enum verbatim.
export type SignalResponseStatus = 'pending' | 'processing' | 'ready' | 'stale' | 'failed'
export type SignalResponseMode = 'active' | 'forming' | 'dormant'

export interface SignalProblemStatement {
    problem_statement: string
}

export interface SignalResponse {
    clusterId: number
    signalScore: number | null
    recency: number | null
    momentum7d: number | null
    momentum30d: number | null
    momentum90d: number | null
    totalPosts: number | null
    authorCount: number | null
    communityCount: number | null
    platformCount: number | null
    sourceCommunities: string[] | null
    avgComments: number | null
    avgVotes: number | null
    postVolumeByWeek: SignalWeeklyVolume[] | null
    topProblemStatements: SignalProblemStatement[] | null
    status: SignalResponseStatus
    generatedAt: string | null
    mode: SignalResponseMode
    completeness: number
}

export interface SignalPipeline {
    id: string
    name: string
    notes: string | null
    sourceClusterId: string | null
    stage: PipelineStage
}

export interface SignalCluster {
    id: number
    name: string | null
    summary: string | null
    opportunityType: string | null
    opportunityDomain: string | null
    signalScore?: number | null
    postCount: number
    commentCount: number
    averageUpvoteRatio: number | null
    persistenceScore: number | null
    intraClusterDensity: number | null
    silhouetteScore: number | null
    authorCount: number | null
    communityCount: number | null
    trending: boolean | null
    dateRange: { from: string | null; to: string | null }
}

export interface SignalAnalytics {
    sourceBreakdown: {
        platform?: string
        site?: string
        source?: string
        count: number
        percentage?: number
        role?: string
        audience_interpretation?: string
    }[]
    topTerms: { term: string; score: number }[]
    postVolumeByDate: { date: string; count: number }[]
}

export interface SignalMetrics {
    postCount: number
    avgSourceScore: number | null
    commentCount: number
    averageUpvoteRatio: number | null
}

export interface SignalOverviewMetrics {
    posts?: number | null
    comments?: number | null
    authors?: number | null
    communities?: number | null
    agreement?: number | null
    avg_upvote_ratio?: number | null
    focus?: number | null
}

export interface SignalOverviewProblem {
    id?: string | number | null
    problem_id?: string | number | null
    title?: string | null
    description?: string | null
    problem_statement?: string | null
    why_it_matters?: string | null
    supporting_evidence_count?: number | null
    evidence_count?: number | null
    supporting_post_ids?: (string | number)[]
    representative_post_ids?: (string | number)[]
    evidence_ids?: (string | number)[]
    source_communities?: string[]
    confidence?: number | null
}

export interface SignalOverviewEvidence {
    id?: string | number | null
    post_id?: string | number | null
    title?: string | null
    body?: string | null
    snippet?: string | null
    excerpt?: string | null
    source?: string | null
    community?: string | null
    comments?: number | null
    num_comments?: number | null
    comment_count?: number | null
    upvote_ratio?: number | null
    score?: number | null
    url?: string | null
    permalink?: string | null
    matched_problem_ids?: (string | number)[]
    why_this_matters?: string | null
}

export interface SignalOverviewSourceEvidence {
    source?: string | null
    count?: number | null
    percentage?: number | null
    representative_post_ids?: (string | number)[]
}

export interface SignalOverviewAudienceContext {
    primary_audience?: string | null
    adjacent_audiences?: string[]
    audience_summary?: string | null
    summary?: string | null
    source_mix_interpretation?: string | null
    audience_risks?: string[]
    suggested_first_audience_to_research?: string | null
    supporting_post_ids?: (string | number)[]
    source_evidence?: SignalOverviewSourceEvidence[]
}

export interface SignalOverviewQuestion {
    id?: string | number | null
    question?: string | null
    why_it_matters?: string | null
    why_ask?: string | null
    dimension?: string | null
    supporting_evidence_count?: number | null
    supporting_post_ids?: (string | number)[]
    related_problem_id?: string | number | null
    related_problem_ids?: (string | number)[]
}

export interface SignalOverview {
    signal_metrics?: SignalOverviewMetrics | null
    problem_breakdown?: SignalOverviewProblem[] | null
    top_evidence?: SignalOverviewEvidence[] | null
    audience_context?: SignalOverviewAudienceContext | null
    source_breakdown?: SignalAnalytics['sourceBreakdown'] | null
    questions_to_investigate?: SignalOverviewQuestion[] | null
}

export interface SignalWorkspace {
    pipeline: SignalPipeline
    mode?: SignalMode
    cluster: SignalCluster | null
    signal?: SignalPayload | null
    metrics: SignalMetrics
    analytics: SignalAnalytics | null
    availability: { clusterAnalytics: boolean }
    signalOverview?: SignalOverview | null
    overviewStatus?: string | null
    overviewError?: string | null
    overviewSchemaVersion?: string | null
    overviewGeneratedAt?: string | null
    overviewModelVersion?: string | null
    overviewInputFingerprint?: string | null
}

export interface EvidencePost {
    id: string
    title: string
    excerpt: string
    community: string | null
    source: string | null
    engagement: number | null
    numComments: number | null
    upvoteRatio: number | null
    similarityScore: number | null
    observedAt: string | null
    dateType: 'posted' | 'observed'
    url: string | null
}

export interface EvidenceDetail extends EvidencePost {
    body: string | null
    author: string | null
    topComments: unknown[]
}

export interface EvidenceResponse {
    data: EvidencePost[]
    total: number
    page: number
    pageSize: number
    communities: string[]
}

