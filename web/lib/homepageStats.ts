import type { HomepageStats } from '@/lib/types/homepageStats'

/**
 * Zeroed fallback used when the backend is unreachable. We deliberately show
 * real zeros rather than fabricated counts — the proof strip never displays fake
 * numbers. `live: false` makes the UI show "+" and a "Signal to date" label.
 */
export const FALLBACK_HOME_STATS: HomepageStats = {
    conversationsAnalyzed: 0,
    clustersDetected: 0,
    dataPointsAnalyzed: 0,
    live: false,
}

function countOrZero(value: unknown): number {
    const count = Number(value)
    return Number.isFinite(count) && count >= 0 ? count : 0
}

/**
 * Fetches the public homepage stats from the backend (the real data source —
 * there is no Supabase in this app) and maps them to the three numbers the
 * homepage proof strip shows:
 *
 *   - dataPointsAnalyzed ← conversationsAnalyzed (total cluster_items)
 *   - clustersDetected   ← clustersDetected (total clusters)
 *
 * Runs server-side only. On any failure every number is 0 (never fabricated).
 */
export async function getHomepageStats(): Promise<HomepageStats> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    if (!apiUrl) return FALLBACK_HOME_STATS

    try {
        const res = await fetch(`${apiUrl}/public/stats`, { cache: 'no-store' })
        if (!res.ok) return FALLBACK_HOME_STATS

        const json = await res.json()

        const conversationsAnalyzed = countOrZero(json?.conversationsAnalyzed)
        const clustersDetected = countOrZero(json?.clustersDetected)

        return {
            conversationsAnalyzed,
            clustersDetected,
            dataPointsAnalyzed: conversationsAnalyzed,
            generatedAt: typeof json?.generatedAt === 'string' ? json.generatedAt : undefined,
            live: true,
        }
    } catch {
        return FALLBACK_HOME_STATS
    }
}
