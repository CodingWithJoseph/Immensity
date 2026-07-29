'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchJson, ApiData } from '@/lib/fetchJson'
import type { ExplorerData, ExplorerRow } from '../types'

type SortKey = 'loads' | 'errors' | 'errorRate' | 'lcpP75'

function pct(value: number | null) {
    if (value == null) return '—'
    return `${(value * 100).toFixed(value < 0.01 ? 2 : 1)}%`
}

function ms(value: number | null) {
    if (value == null) return '—'
    return value < 1000 ? `${Math.round(value)}ms` : `${(value / 1000).toFixed(2)}s`
}

const HEALTH_TONE: Record<ExplorerRow['health'], string> = {
    healthy: 'bg-(--color-blue)',
    warning: 'bg-(--color-warning)',
    unhealthy: 'bg-(--color-error)',
    'no-data': 'bg-(--color-text-muted)',
}

function HealthBadge({ health }: { health: ExplorerRow['health'] }) {
    return (
        <span className="inline-flex items-center gap-1.5 text-xs text-(--color-text-muted)">
            <span className={`h-2 w-2 rounded-full ${HEALTH_TONE[health]}`} />
            {health}
        </span>
    )
}

function Sparkline({ values }: { values: number[] }) {
    if (!values.length) return <span className="text-(--color-text-muted)">—</span>
    const max = Math.max(...values, 1)
    const w = 80
    const h = 20
    const step = values.length > 1 ? w / (values.length - 1) : w
    const points = values.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`).join(' ')
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="text-(--color-text)" aria-hidden="true">
            <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    )
}

function Header({ label, sortKey, active, dir, onSort, align = 'right' }: { label: string; sortKey: SortKey; active: boolean; dir: 'asc' | 'desc'; onSort: (k: SortKey) => void; align?: 'left' | 'right' }) {
    return (
        <button
            type="button"
            onClick={() => onSort(sortKey)}
            className={`flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted) transition-colors hover:text-(--color-text) ${align === 'right' ? 'justify-end' : ''}`}
        >
            {label}{active ? (dir === 'desc' ? ' ↓' : ' ↑') : ''}
        </button>
    )
}

export default function ExplorerPanel({ pipelineId }: { pipelineId: string | null }) {
    const [data, setData] = useState<ExplorerData | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [sortKey, setSortKey] = useState<SortKey>('loads')
    const [dir, setDir] = useState<'asc' | 'desc'>('desc')

    useEffect(() => {
        if (!pipelineId) return
        let active = true
        void (async () => {
            setLoading(true)
            setError(null)
            try {
                const json = await fetchJson<ApiData<ExplorerData>>(`/api/monitor/${pipelineId}/explorer`)
                if (active) setData(json?.data ?? null)
            } catch (err) {
                if (active) setError(err instanceof Error ? err.message : 'Could not load explorer')
            } finally {
                if (active) setLoading(false)
            }
        })()
        return () => { active = false }
    }, [pipelineId])

    function sort(key: SortKey) {
        if (key === sortKey) setDir(d => (d === 'desc' ? 'asc' : 'desc'))
        else { setSortKey(key); setDir('desc') }
    }

    const rows = useMemo(() => {
        const list = [...(data?.rows ?? [])]
        list.sort((a, b) => {
            const av = a[sortKey]
            const bv = b[sortKey]
            // Nulls always sort to the bottom regardless of direction.
            if (av == null && bv == null) return 0
            if (av == null) return 1
            if (bv == null) return -1
            return dir === 'desc' ? bv - av : av - bv
        })
        return list
    }, [data, sortKey, dir])

    const windowDays = data?.windowDays ?? 14

    return (
        <section className="rounded-md bg-(--color-card)">
            <div className="border-b border-(--color-border) px-5 py-4">
                <p className="text-sm font-semibold text-(--color-text)">Explorer</p>
                <p className="mt-1 text-xs text-(--color-text-muted)">Every page, ranked — loads, error rate, and felt-speed over {windowDays}d. Click a column to sort.</p>
            </div>

            {loading && <p className="px-5 py-4 text-sm text-(--color-text-muted)">Loading explorer…</p>}
            {error && <p className="px-5 py-4 text-sm text-(--color-error)">{error}</p>}

            {!loading && !error && (
                rows.length ? (
                    <div className="overflow-x-auto">
                        <div className="grid min-w-[760px] grid-cols-[minmax(0,1fr)_90px_80px_90px_90px_110px_90px] items-center gap-3 border-b border-(--color-border) px-5 py-2">
                            <span className="text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted)">Page</span>
                            <Header label="Loads" sortKey="loads" active={sortKey === 'loads'} dir={dir} onSort={sort} />
                            <Header label="Errors" sortKey="errors" active={sortKey === 'errors'} dir={dir} onSort={sort} />
                            <Header label="Err rate" sortKey="errorRate" active={sortKey === 'errorRate'} dir={dir} onSort={sort} />
                            <Header label="LCP p75" sortKey="lcpP75" active={sortKey === 'lcpP75'} dir={dir} onSort={sort} />
                            <span className="text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted)">Health</span>
                            <span className="text-right text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted)">Trend</span>
                        </div>
                        <div className="divide-y divide-(--color-border)">
                            {rows.map(row => (
                                <div key={row.url} className="grid min-w-[760px] grid-cols-[minmax(0,1fr)_90px_80px_90px_90px_110px_90px] items-center gap-3 px-5 py-2.5 text-sm">
                                    <span className="truncate text-(--color-text)" title={row.url}>{row.url}</span>
                                    <span className="text-right tabular-nums text-(--color-text)">{row.loads.toLocaleString()}</span>
                                    <span className="text-right tabular-nums text-(--color-text-muted)">{row.errors}</span>
                                    <span className={`text-right tabular-nums ${row.errorRate != null && row.errorRate >= 0.05 ? 'text-(--color-error)' : 'text-(--color-text-muted)'}`}>{pct(row.errorRate)}</span>
                                    <span className={`text-right tabular-nums ${row.lcpRating === 'poor' ? 'text-(--color-error)' : 'text-(--color-text-muted)'}`}>{ms(row.lcpP75)}</span>
                                    <HealthBadge health={row.health} />
                                    <span className="flex justify-end"><Sparkline values={row.spark} /></span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <p className="px-5 py-4 text-sm text-(--color-text-muted)">No page traffic in the last {windowDays} days yet.</p>
                )
            )}
        </section>
    )
}
