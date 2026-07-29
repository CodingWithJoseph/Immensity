import { NextResponse } from 'next/server'
import { getHomepageStats } from '@/lib/homepageStats'

// Public homepage stats. Queries the backend server-side (the real data source;
// there is no Supabase in this app) and returns the three numbers the proof
// strip renders. No credentials are exposed to the client. Always fresh —
// getHomepageStats falls back gracefully if the backend is unreachable.
export const dynamic = 'force-dynamic'

export type StatsResponse = {
    dataPointsAnalyzed: number
    clustersDetected: number
    live: boolean
    generatedAt?: string
}

export async function GET() {
    const stats = await getHomepageStats()

    const body: StatsResponse = {
        dataPointsAnalyzed: stats.dataPointsAnalyzed ?? stats.conversationsAnalyzed,
        clustersDetected: stats.clustersDetected,
        live: stats.live,
        generatedAt: stats.generatedAt,
    }

    return NextResponse.json(body)
}
