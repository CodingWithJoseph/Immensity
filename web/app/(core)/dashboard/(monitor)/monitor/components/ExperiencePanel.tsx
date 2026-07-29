'use client'

import { useEffect, useState } from 'react'
import { fetchJson, ApiData } from '@/lib/fetchJson'
import VerdictHeader, { type VerdictTone } from './VerdictHeader'
import type { ExperienceMetrics, VitalMetricSummary, VitalRating } from '../types'


type Verdict = { eyebrow: string; verdict: string; tone: VerdictTone; hero?: { value: string; label: string; sub?: string } }

// Lead the Experience view with a plain-language read on felt speed, anchored on
// LCP p75 (the headline "does it feel fast" vital).
export function experienceVerdict(metrics: VitalMetricSummary[]): Verdict {
    const lcp = metrics.find(m => m.metric === 'LCP')
    if (!lcp || lcp.p75 == null) {
        return { eyebrow: 'Experience', verdict: 'Not enough Core Web Vitals captured yet to judge how the app feels.', tone: 'muted' }
    }
    const secs = `${(lcp.p75 / 1000).toFixed(1)}s`
    const hero = { value: secs, label: 'LCP p75', sub: lcp.rating ?? undefined }
    if (lcp.rating === 'good') {
        return { eyebrow: 'Experience', verdict: `Pages feel fast — Largest Contentful Paint is ${secs} at the 75th percentile.`, tone: 'good', hero }
    }
    if (lcp.rating === 'poor') {
        return { eyebrow: 'Experience', verdict: `Pages feel slow — Largest Contentful Paint is ${secs} at the 75th percentile, past the 2.5s bar.`, tone: 'bad', hero }
    }
    return { eyebrow: 'Experience', verdict: `Load speed is borderline — Largest Contentful Paint is ${secs} at the 75th percentile.`, tone: 'neutral', hero }
}

const METRIC_ORDER = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB']
const METRIC_HELP: Record<string, string> = {
    LCP: 'Largest Contentful Paint',
    INP: 'Interaction to Next Paint',
    CLS: 'Cumulative Layout Shift',
    FCP: 'First Contentful Paint',
    TTFB: 'Time to First Byte',
}

function ratingTone(rating: VitalRating | null) {
    if (rating === 'good') return 'text-(--color-blue)'
    if (rating === 'poor') return 'text-(--color-error)'
    if (rating === 'needs-improvement') return 'text-(--color-warning)'
    return 'text-(--color-text-muted)'
}

function ratingDot(rating: VitalRating | null) {
    if (rating === 'good') return 'bg-(--color-blue)'
    if (rating === 'poor') return 'bg-(--color-error)'
    if (rating === 'needs-improvement') return 'bg-(--color-warning)'
    return 'bg-(--color-text-muted)'
}

function formatValue(metric: string, value: number | null) {
    if (value == null) return '—'
    if (metric === 'CLS') return value.toFixed(3)
    return `${Math.round(value)} ms`
}

function MetricCard({ metric }: { metric: VitalMetricSummary }) {
    return (
        <div className="rounded-md bg-(--color-card) p-4">
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)" title={METRIC_HELP[metric.metric]}>{metric.metric}</p>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${ratingTone(metric.rating)}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${ratingDot(metric.rating)}`} />
                    {metric.rating ?? 'no data'}
                </span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-(--color-text)">{formatValue(metric.metric, metric.p75)}</p>
            <p className="mt-1 text-xs text-(--color-text-muted)">p75 · {metric.sampleCount} samples</p>
        </div>
    )
}

export default function ExperiencePanel({ pipelineId }: { pipelineId: string | null }) {
    const [data, setData] = useState<ExperienceMetrics | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!pipelineId) return
        let active = true
        void (async () => {
            setLoading(true)
            setError(null)
            try {
                const json = await fetchJson<ApiData<ExperienceMetrics>>(`/api/monitor/${pipelineId}/experience`)
                if (active) setData(json?.data ?? null)
            } catch (err) {
                if (active) setError(err instanceof Error ? err.message : 'Could not load experience vitals')
            } finally {
                if (active) setLoading(false)
            }
        })()
        return () => { active = false }
    }, [pipelineId])

    const windowDays = data?.windowDays ?? 14
    const metrics = (data?.metrics ?? []).slice().sort((a, b) => METRIC_ORDER.indexOf(a.metric) - METRIC_ORDER.indexOf(b.metric))
    const pages = data?.pages ?? []
    const pageColumns = METRIC_ORDER.filter(m => pages.some(p => p.metrics[m]))

    return (
        <section className="flex flex-col gap-6">
            {loading && <p className="text-sm text-(--color-text-muted)">Loading experience vitals…</p>}
            {error && <p className="rounded-md border border-(--color-error) px-3 py-2 text-sm text-(--color-error)">{error}</p>}

            {!loading && !error && (
                <>
                    <VerdictHeader {...experienceVerdict(metrics)} />
                    {metrics.length === 0 ? (
                        <p className="rounded-md bg-(--color-card) p-5 text-sm text-(--color-text-muted)">
                            No Core Web Vitals captured in the last {windowDays} days yet. They arrive once visitors load instrumented pages.
                        </p>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                            {metrics.map(metric => <MetricCard key={metric.metric} metric={metric} />)}
                        </div>
                    )}

                    {pages.length > 0 && (
                        <section className="rounded-md bg-(--color-card)">
                            <div className="border-b border-(--color-border) px-5 py-4">
                                <p className="text-sm font-semibold text-(--color-text)">By page (p75)</p>
                                <p className="mt-1 text-xs text-(--color-text-muted)">Which URLs carry the worst experience — most sampled first.</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">
                                            <th className="px-5 py-3 text-left font-semibold">Page</th>
                                            {pageColumns.map(col => <th key={col} className="px-3 py-3 text-right font-semibold">{col}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-(--color-border)">
                                        {pages.map(page => (
                                            <tr key={page.url}>
                                                <td className="max-w-0 px-5 py-3">
                                                    <span className="block truncate text-(--color-text)" title={page.url}>{page.url}</span>
                                                </td>
                                                {pageColumns.map(col => {
                                                    const cell = page.metrics[col]
                                                    return (
                                                        <td key={col} className={`px-3 py-3 text-right ${ratingTone(cell?.rating ?? null)}`}>
                                                            {cell ? formatValue(col, cell.p75) : '—'}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}
                </>
            )}
        </section>
    )
}
