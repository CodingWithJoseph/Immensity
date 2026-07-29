export interface SignalPost {
    id: string
    title: string
    description: string | null
    source: string
    sourceUrl: string | null
    author: string | null
    sourceScore: number | null
    numComments: number | null
    createdAt: string | null
}

export interface SignalMetrics {
    postCount: number
    avgSourceScore: number | null
}

export interface ClusterSignalInfo {
    id: number
    name: string | null
    trending: boolean | null
    growthRateWow: number | null
    growthRateMom: number | null
    postVelocity: number | null
}

export interface ClusterTimelineSamplePost {
    id?: string
    title?: string
    url?: string
    source?: string
}

export interface ClusterTimelineSnapshot {
    date: string
    postCount: number
    samplePosts: ClusterTimelineSamplePost[]
}

export interface ClusterTimelineResponse {
    clusterId: number
    hasSufficientHistory: boolean
    growthRateWow: number | null
    growthRateMom: number | null
    postVelocity: number | null
    snapshots: ClusterTimelineSnapshot[]
}

export interface SignalPipelineInfo {
    id: string
    name: string
    notes: string | null
    sourceClusterId: string | null
    stage: string
}

export interface SignalResponse {
    pipeline: SignalPipelineInfo
    cluster: ClusterSignalInfo | null
    metrics: SignalMetrics
    posts: SignalPost[]
}

export interface ExtractedInsight {
    id: string
    text: string
    sourcePostId: string
    sourcePostTitle: string
}
