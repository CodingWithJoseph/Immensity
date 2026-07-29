'use client'

import { useEffect, useState } from 'react'
import { fetchJson, ApiData } from '@/lib/fetchJson'
import type { TimeseriesData } from '../types'

type Metric = 'errors' | 'loads'

const W = 720
const H = 180
const PAD_X = 10
const PAD_T = 12
const PAD_B = 16

const METRICS: { key: Metric; label: string }[] = [
    { key: 'errors', label: 'Errors' },
    { key: 'loads', label: 'Loads' },
]

export default function OverTimeChart({ pipelineId }: { pipelineId: string | null }) {
    const [metric, setMetric] = useState<Metric>('errors')
    const [data, setData] = useState<TimeseriesData | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!pipelineId) return
        let active = true
        void (async () => {
            setLoading(true)
            setError(null)
            try {
                const json = await fetchJson<ApiData<TimeseriesData>>(`/api/monitor/${pipelineId}/timeseries?metric=${metric}`)
                if (active) setData(json?.data ?? null)
            } catch (err) {
                if (active) setError(err instanceof Error ? err.message : 'Could not load chart')
            } finally {
                if (active) setLoading(false)
            }
        })()
        return () => { active = false }
    }, [pipelineId, metric])

    const points = data?.points ?? []
    const baseline = data?.baseline
    const markers = data?.markers ?? []
    const windowDays = data?.windowDays ?? 14

    const innerW = W - PAD_X * 2
    const innerH = H - PAD_T - PAD_B
    const n = points.length
    const max = Math.max(1, ...points.map(p => p.value), baseline?.upper ?? 0)
    const x = (i: number) => PAD_X + (n <= 1 ? 0 : (i / (n - 1)) * innerW)
    const y = (v: number) => PAD_T + innerH - (v / max) * innerH

    const linePoints = points.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
    const dateIndex = new Map(points.map((p, i) => [p.date, i]))
    const peak = points.reduce((m, p) => Math.max(m, p.value), 0)

    return (
        <section className="rounded-md bg-(--color-card)">
            <div className="flex items-center justify-between border-b border-(--color-border) px-5 py-4">
                <div>
                    <p className="text-sm font-semibold text-(--color-text)">Over time</p>
                    <p className="mt-1 text-xs text-(--color-text-muted)">{windowDays}d, with the normal range and deploy markers.</p>
                </div>
                <div className="flex gap-1">
                    {METRICS.map(m => (
                        <button
                            key={m.key}
                            type="button"
                            onClick={() => setMetric(m.key)}
                            aria-pressed={metric === m.key}
                            className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${metric === m.key ? 'border-(--color-text) font-medium text-(--color-text)' : 'border-(--color-border) text-(--color-text-muted) hover:bg-(--color-bg)'}`}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading && <p className="px-5 py-4 text-sm text-(--color-text-muted)">Loading chart…</p>}
            {error && <p className="px-5 py-4 text-sm text-(--color-error)">{error}</p>}

            {!loading && !error && (
                points.some(p => p.value > 0) ? (
                    <div className="px-5 py-4">
                        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${metric} over ${windowDays} days`}>
                            {/* normal-range band */}
                            {baseline && baseline.upper > 0 && (
                                <rect
                                    x={PAD_X}
                                    y={y(baseline.upper)}
                                    width={innerW}
                                    height={Math.max(0, y(baseline.lower) - y(baseline.upper))}
                                    className="fill-(--color-accent-soft)"
                                />
                            )}
                            {baseline && (
                                <line x1={PAD_X} x2={W - PAD_X} y1={y(baseline.mean)} y2={y(baseline.mean)} className="stroke-(--color-border-strong)" strokeWidth="1" strokeDasharray="3 3" />
                            )}
                            {/* deploy markers */}
                            {markers.map(m => {
                                const i = dateIndex.get(m.date)
                                if (i === undefined) return null
                                return (
                                    <g key={`${m.date}-${m.release}`}>
                                        <line x1={x(i)} x2={x(i)} y1={PAD_T} y2={PAD_T + innerH} className="stroke-(--color-accent)" strokeWidth="1" strokeDasharray="2 2" />
                                        <title>{`${m.release} · ${m.date}`}</title>
                                    </g>
                                )
                            })}
                            {/* series */}
                            <polyline points={linePoints} fill="none" className="stroke-(--color-text)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
                            {/* points above the normal range are the abnormal cue */}
                            {points.map((p, i) => (baseline && p.value > baseline.upper) ? (
                                <circle key={i} cx={x(i)} cy={y(p.value)} r="2.5" className="fill-(--color-error)" />
                            ) : null)}
                        </svg>
                        <div className="mt-2 flex items-center justify-between text-xs text-(--color-text-muted)">
                            <span>peak {peak}</span>
                            {baseline && <span>normal ≈ {baseline.mean}/day</span>}
                            <span>{markers.length} {markers.length === 1 ? 'deploy' : 'deploys'}</span>
                        </div>
                    </div>
                ) : (
                    <p className="px-5 py-4 text-sm text-(--color-text-muted)">No {metric} in the last {windowDays} days.</p>
                )
            )}
        </section>
    )
}
