export type HomepageStats = {
    // The two real counts from the 6-table schema: cluster_items and clusters.
    conversationsAnalyzed: number
    clustersDetected: number
    dataPointsAnalyzed?: number
    generatedAt?: string
    live: boolean
}
