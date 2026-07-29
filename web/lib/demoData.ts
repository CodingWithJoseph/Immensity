import type { DemoCluster, DemoData, DemoSignal } from '@/lib/types/demo'

/**
 * Representative snapshot used when the live backend is unavailable (no
 * NEXT_PUBLIC_API_URL, network error, or an auth-gated endpoint). Served with
 * live: false so the page is clearly labeled a sample rather than claiming to
 * be live. Coherent across both views.
 */
const FALLBACK_CLUSTERS: DemoCluster[] = [
    {
        id: 1,
        label: 'Invoice reconciliation for solo freelancers',
        postCount: 4120,
        trending: true,
        signals: [
            'Is there a tool that reconciles invoices across Stripe and my bank automatically?',
            'I pay for three apps just to fake one reconciliation workflow.',
            'Spent the whole weekend matching payments to invoices by hand again.',
        ],
    },
    {
        id: 2,
        label: 'Burnout tracking for remote engineering teams',
        postCount: 3110,
        trending: true,
        signals: [
            'Our standups miss the early signs of burnout every single time.',
            'Would pay for something that flags overload before someone quits.',
            'Velocity dashboards tell me nothing about how the team actually feels.',
        ],
    },
    {
        id: 3,
        label: 'Self-hosted home automation without subscriptions',
        postCount: 2680,
        trending: false,
        signals: [
            'Why does every smart-home hub now require a monthly fee?',
            'Looking for a local-first setup that survives the company going under.',
            'I just want my automations to keep working without the cloud.',
        ],
    },
    {
        id: 4,
        label: 'AI meeting notes that sync back into the CRM',
        postCount: 2540,
        trending: true,
        signals: [
            'Note-takers are everywhere but none write back to my CRM fields.',
            'I retype every call summary into HubSpot — there has to be a better way.',
            'Would switch instantly for accurate CRM sync, not just a transcript.',
        ],
    },
    {
        id: 5,
        label: 'Inventory sync for multi-channel Etsy & Shopify sellers',
        postCount: 1980,
        trending: false,
        signals: [
            'Sold the same item on two channels again and had to refund.',
            'Every inventory sync tool is built for warehouses, not small shops.',
            'I keep a spreadsheet as the source of truth because nothing else fits.',
        ],
    },
    {
        id: 6,
        label: 'Prep tools for indie tabletop game masters',
        postCount: 1640,
        trending: true,
        signals: [
            'Session prep takes longer than the session itself.',
            'I stitch together five tabs to run one night of a campaign.',
            'Would happily pay for prep that remembers my world and players.',
        ],
    },
    {
        id: 7,
        label: 'Allergy-safe meal planning for families',
        postCount: 1450,
        trending: false,
        signals: [
            'Planning meals around two different allergies is a part-time job.',
            'Recipe apps ignore cross-contamination entirely.',
            'I want a planner that actually understands "no nuts, no dairy."',
        ],
    },
    {
        id: 8,
        label: 'Lightweight CRM for freelance consultants',
        postCount: 1290,
        trending: false,
        signals: [
            'Every CRM assumes a sales team — I am a team of one.',
            'I track leads in Notion because real CRMs are overkill.',
            'Just want reminders and a pipeline without the enterprise bloat.',
        ],
    },
    {
        id: 9,
        label: 'Local-first note apps with reliable sync',
        postCount: 1120,
        trending: false,
        signals: [
            'I want my notes to open instantly and still sync across devices.',
            'Cloud-only note apps are unusable on a plane.',
            'Sync conflicts make me distrust the whole thing.',
        ],
    },
]

const FALLBACK_SIGNALS: DemoSignal[] = [
    { id: 's1', title: 'I pay for three apps just to fake one reconciliation workflow.', cluster: 'Invoice reconciliation' },
    { id: 's2', title: 'Would pay for something that flags overload before someone quits.', cluster: 'Burnout tracking' },
    { id: 's3', title: 'Would switch instantly for accurate CRM sync, not just a transcript.', cluster: 'AI meeting notes' },
    { id: 's4', title: 'Why does every smart-home hub now require a monthly fee?', cluster: 'Self-hosted automation' },
    { id: 's5', title: 'Session prep takes longer than the session itself.', cluster: 'TTRPG prep tools' },
    { id: 's6', title: 'Sold the same item on two channels again and had to refund.', cluster: 'Inventory sync' },
    { id: 's7', title: 'Planning meals around two different allergies is a part-time job.', cluster: 'Allergy-safe planning' },
    { id: 's8', title: 'Every CRM assumes a sales team — I am a team of one.', cluster: 'Lightweight CRM' },
    { id: 's9', title: 'Cloud-only note apps are unusable on a plane.', cluster: 'Local-first notes' },
    { id: 's10', title: 'I keep a spreadsheet as the source of truth because nothing else fits.', cluster: 'Inventory sync' },
]

export function getFallbackDemoData(): DemoData {
    return {
        clusters: FALLBACK_CLUSTERS,
        signals: FALLBACK_SIGNALS,
        generatedAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
        live: false,
    }
}

// ─── Defensive normalization ──────────────────────────────────────────────
// The live backend is a separate service; field casing can vary, and there is
// no env here to verify against. Read both camelCase and snake_case.

type Raw = Record<string, unknown>

function pick(obj: Raw, ...keys: string[]): unknown {
    for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null) return obj[key]
    }
    return undefined
}

function asString(v: unknown): string | null {
    return typeof v === 'string' && v.trim() ? v.trim() : null
}

function mapLive(rawClusters: Raw[]): DemoData {
    const clusters: DemoCluster[] = rawClusters
        .filter((c) => c && typeof c === 'object')
        .map((c, i) => {
            const id = Number(pick(c, 'id')) || i
            const reps: string[] = Array.isArray(pick(c, 'samplePosts', 'sample_posts'))
                ? (pick(c, 'samplePosts', 'sample_posts') as Raw[])
                      .map((p) => asString(pick(p, 'title')))
                      .filter((t): t is string => Boolean(t))
                      .slice(0, 3)
                : []
            return {
                id,
                label: asString(pick(c, 'name')) ?? `Cluster ${id}`,
                postCount: Math.max(0, Math.round(Number(pick(c, 'postCount', 'post_count')) || 0)),
                trending: pick(c, 'trending') === true,
                signals: reps,
            }
        })
        .slice(0, 9)

    // Representative signal titles are derived from the clusters' sample posts.
    const signals: DemoSignal[] = clusters
        .flatMap((c) => c.signals.map((title, i) => ({ id: `${c.id}-${i}`, title, cluster: c.label })))
        .slice(0, 12)

    return {
        clusters,
        signals,
        generatedAt: new Date().toISOString(),
        live: true,
    }
}

/**
 * Public demo dataset. Attempts the live backend server-side (no user token —
 * these are aggregate, read-only views). Falls back to the representative
 * snapshot on missing env, network error, non-OK response, or empty data, so
 * the page is never broken and never claims sample data is live.
 */
export async function getDemoData(): Promise<DemoData> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    if (!apiUrl) return getFallbackDemoData()

    try {
        const clustersRes = await fetch(`${apiUrl}/clusters/trending?limit=9`, { next: { revalidate: 2400 } })

        if (!clustersRes.ok) return getFallbackDemoData()

        const clustersJson = await clustersRes.json()

        const rawClusters: Raw[] = Array.isArray(clustersJson)
            ? clustersJson
            : Array.isArray(clustersJson?.data)
              ? clustersJson.data
              : Array.isArray(clustersJson?.clusters)
                ? clustersJson.clusters
                : []

        if (rawClusters.length === 0) return getFallbackDemoData()

        const mapped = mapLive(rawClusters)
        // If mapping produced nothing usable, prefer the rich snapshot.
        if (mapped.clusters.length === 0) return getFallbackDemoData()
        return mapped
    } catch {
        return getFallbackDemoData()
    }
}
