'use client'
import { useEffect, useMemo, useState } from 'react'
import { fetchJson, ApiData } from '@/lib/fetchJson'
import { shortPath } from '@/lib/flowLayout'
import Chip, { type ChipTone } from '@/app/(core)/dashboard/components/Chip'
import EmptyState from '@/app/(core)/dashboard/components/EmptyState'
import type { FeatureFlowData, FlowData } from '../types'
import FlowGraph from './FlowGraph'

type Mode = 'features' | 'pages'

interface FeatureMeta { errorCount: number; avgDurationMs: number | null }

function ToggleButton({ active, onClick, children }: { active: boolean; onClick?: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                active ? 'bg-(--color-button) text-(--color-on-button) hover:bg-(--color-button-hover)' : 'text-(--color-text-muted) hover:text-(--color-text)'
            }`}
        >
            {children}
        </button>
    )
}

function formatMs(ms: number | null): string {
    if (ms == null) return '—'
    return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`
}

// Error rate → the shared Chip tone scale, so a feature's health reads the same
// as every other status chip in the app.
function errorRateTone(rate: number): ChipTone {
    if (rate === 0) return 'success'
    if (rate < 10) return 'warning'
    return 'danger'
}

// A feature flow is adapted into the shared FlowData shape (feature → url,
// count → visits) so the same graph pipeline renders it; the per-feature
// outcome metrics ride alongside in a lookup for the detail panel.
function adaptFeatureFlow(ff: FeatureFlowData): { data: FlowData; meta: Record<string, FeatureMeta> } {
    const meta: Record<string, FeatureMeta> = {}
    const nodes = ff.nodes.map(n => {
        meta[n.feature] = { errorCount: n.errorCount, avgDurationMs: n.avgDurationMs }
        return { url: n.feature, visits: n.count }
    })
    return { data: { windowDays: ff.windowDays, nodes, edges: ff.edges }, meta }
}

async function loadFeatures(pipelineId: string): Promise<{ data: FlowData; meta: Record<string, FeatureMeta> }> {
    const json = await fetchJson<ApiData<FeatureFlowData>>(`/api/monitor/${pipelineId}/feature-flow`)
    return adaptFeatureFlow(json?.data ?? { windowDays: 14, nodes: [], edges: [] })
}

async function loadPages(pipelineId: string): Promise<{ data: FlowData; meta: null }> {
    const json = await fetchJson<ApiData<FlowData>>(`/api/monitor/${pipelineId}/flow`)
    return { data: json?.data ?? { windowDays: 14, nodes: [], edges: [] }, meta: null }
}

function DetailPanel({ data, selectedId, mode, featureMeta }: {
    data: FlowData
    selectedId: string | null
    mode: Mode
    featureMeta: Record<string, FeatureMeta> | null
}) {
    const totalVisits = useMemo(() => data.nodes.reduce((s, n) => s + n.visits, 0) || 1, [data.nodes])
    const index = selectedId ? Number(selectedId.slice(1)) : -1
    const node = index >= 0 ? data.nodes[index] : null
    const isFeatures = mode === 'features'

    if (!node) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                <p className="text-sm font-medium text-(--color-text)">{isFeatures ? 'No feature selected' : 'No page selected'}</p>
                <p className="text-xs text-(--color-text-muted)">
                    Select any node to see its {isFeatures ? 'runs and where users go next' : 'requests and where visitors go next'}.
                </p>
            </div>
        )
    }

    const outgoing = data.edges.filter(e => e.from === node.url && e.to !== node.url).sort((a, b) => b.count - a.count)
    const share = Math.round((node.visits / totalVisits) * 100)
    const meta = isFeatures && featureMeta ? featureMeta[node.url] : null
    const errorRate = meta ? Math.round((meta.errorCount / Math.max(node.visits, 1)) * 100) : null

    return (
        <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted)">{isFeatures ? 'Selected feature' : 'Selected page'}</p>
                    <p className="mt-1 truncate text-sm font-semibold text-(--color-text)" title={node.url}>{isFeatures ? node.url : shortPath(node.url)}</p>
                </div>
                {errorRate != null && <Chip label={`${errorRate}% errors`} tone={errorRateTone(errorRate)} appearance="filled" />}
            </div>
            <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-(--color-card) p-3">
                    <dt className="text-[11px] text-(--color-text-muted)">{isFeatures ? 'Runs' : 'Requests'}</dt>
                    <dd className="mt-0.5 text-lg font-semibold tabular-nums text-(--color-text)">{node.visits.toLocaleString()}</dd>
                </div>
                <div className="rounded-md bg-(--color-card) p-3">
                    <dt className="text-[11px] text-(--color-text-muted)">{meta ? 'Avg time' : 'Share of traffic'}</dt>
                    <dd className="mt-0.5 text-lg font-semibold tabular-nums text-(--color-text)">{meta ? formatMs(meta.avgDurationMs) : `${share}%`}</dd>
                </div>
            </dl>
            <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted)">{isFeatures ? 'Leads to next' : 'Goes to next'} ({outgoing.length})</p>
                {outgoing.length ? (
                    <ul className="mt-2 flex flex-col divide-y divide-(--color-border) rounded-md bg-(--color-card)">
                        {outgoing.slice(0, 8).map(e => (
                            <li key={e.to} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                                <span className="min-w-0 truncate text-(--color-text)" title={e.to}>{isFeatures ? e.to : shortPath(e.to)}</span>
                                <span className="shrink-0 tabular-nums text-(--color-text-muted)">{e.count.toLocaleString()}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="mt-2 text-xs text-(--color-text-muted)">
                        {isFeatures ? 'Users stop here — no onward feature in the window.' : 'Visitors leave from here — no onward page in the window.'}
                    </p>
                )}
            </div>
        </div>
    )
}

export default function FlowGraphView({ pipelineId }: { pipelineId: string | null }) {
    const [mode, setMode] = useState<Mode>('features')
    const [data, setData] = useState<FlowData | null>(null)
    const [featureMeta, setFeatureMeta] = useState<Record<string, FeatureMeta> | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedId, setSelectedId] = useState<string | null>(null)

    // Initial load per project: prefer feature flows; fall back to the URL flow
    // when nothing is instrumented yet, so the view is never empty when there is
    // still page data to show.
    useEffect(() => {
        if (!pipelineId) return
        let active = true
        void (async () => {
            setLoading(true)
            setError(null)
            setSelectedId(null)
            try {
                const features = await loadFeatures(pipelineId)
                if (!active) return
                if (features.data.nodes.length > 0) {
                    setMode('features'); setData(features.data); setFeatureMeta(features.meta)
                } else {
                    const pages = await loadPages(pipelineId)
                    if (!active) return
                    setMode('pages'); setData(pages.data); setFeatureMeta(null)
                }
            } catch (err) {
                if (active) setError(err instanceof Error ? err.message : 'Could not load flow')
            } finally {
                if (active) setLoading(false)
            }
        })()
        return () => { active = false }
    }, [pipelineId])

    async function switchMode(next: Mode) {
        if (next === mode || !pipelineId) return
        setMode(next); setSelectedId(null); setLoading(true); setError(null)
        try {
            const r = next === 'features' ? await loadFeatures(pipelineId) : await loadPages(pipelineId)
            setData(r.data); setFeatureMeta(r.meta)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load flow')
        } finally {
            setLoading(false)
        }
    }

    const windowDays = data?.windowDays ?? 14
    const hasGraph = !!data && data.nodes.length > 0
    // Drop a stale selection (e.g. after switching projects/mode) at render time.
    const safeSelectedId = data && selectedId && Number(selectedId.slice(1)) < data.nodes.length ? selectedId : null

    return (
        <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-(--color-text-muted)">
                    {mode === 'features'
                        ? `Named user flows and how one leads into the next, over the last ${windowDays} days.`
                        : `Aggregate page→page paths across all sessions over the last ${windowDays} days.`}
                </p>
                <div className="flex items-center overflow-hidden rounded-md border border-(--color-border) bg-(--color-card)">
                    <ToggleButton active={mode === 'features'} onClick={() => switchMode('features')}>Features</ToggleButton>
                    <span className="h-5 w-px bg-(--color-border)" />
                    <ToggleButton active={mode === 'pages'} onClick={() => switchMode('pages')}>Pages</ToggleButton>
                </div>
            </div>

            {loading && <p className="text-sm text-(--color-text-muted)">Loading flow…</p>}
            {error && <p className="text-sm text-(--color-error)">{error}</p>}

            {!loading && !error && (
                hasGraph ? (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
                        <div className="h-[clamp(420px,62vh,720px)] overflow-hidden rounded-md border border-(--color-border) bg-(--color-bg)">
                            <FlowGraph data={data} selectedId={safeSelectedId} onSelect={setSelectedId} />
                        </div>
                        <div className="h-[clamp(420px,62vh,720px)] overflow-hidden rounded-md border border-(--color-border) bg-(--color-card)">
                            <DetailPanel data={data} selectedId={safeSelectedId} mode={mode} featureMeta={featureMeta} />
                        </div>
                    </div>
                ) : mode === 'features' ? (
                    <EmptyState
                        compact
                        title="No feature flows yet"
                        description="Wrap a user flow with pf.feature() to record it here — or switch to Pages."
                    />
                ) : (
                    <EmptyState compact title="No page journeys yet" description={`No multi-page journeys in the last ${windowDays} days.`} />
                )
            )}
        </section>
    )
}
