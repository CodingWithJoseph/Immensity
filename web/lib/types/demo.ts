// Read-only shapes for the public /demo dataset. Kept deliberately small — just
// what the demo API returns — and mapped from the backend Cluster contract in
// lib/demoData.ts (there is no Supabase in this app). The simplified schema no
// longer carries opportunity, growth-rate, willingness-to-pay, or intensity
// columns, so those concepts are gone.

export type DemoCluster = {
    id: number
    label: string
    /** representative signal volume (post count) */
    postCount: number
    trending: boolean
    /** 2–3 representative signal titles */
    signals: string[]
}

export type DemoSignal = {
    id: string
    title: string
    cluster: string
}

export type DemoData = {
    clusters: DemoCluster[]
    signals: DemoSignal[]
    /** ISO timestamp of the snapshot */
    generatedAt: string
    /** true = served from the live backend; false = representative snapshot */
    live: boolean
}
