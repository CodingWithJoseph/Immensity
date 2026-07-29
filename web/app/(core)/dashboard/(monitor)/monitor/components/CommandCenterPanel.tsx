'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchJson, ApiData } from '@/lib/fetchJson'
import { routes } from '@/app/util/routes'
import Chip from '@/app/(core)/dashboard/components/Chip'
import { toSeverity, severityChipTone } from '@/lib/monitoring/taxonomy'
import SituationSummary from './SituationSummary'
import type { CommandCenterData, HealthState, TrendValue } from '../types'


// Blue = healthy, amber = caution, red = unhealthy, muted = no data.
const HEALTH_TONE: Record<HealthState, 'good' | 'bad' | 'neutral' | 'muted'> = {
    live: 'good', healthy: 'good',
    failing: 'bad', unhealthy: 'bad',
    noisy: 'neutral', stale: 'neutral', silent: 'neutral', warning: 'neutral',
    'no-data': 'muted',
}

function toneClasses(tone: 'good' | 'bad' | 'neutral' | 'muted') {
    if (tone === 'good') return { text: 'text-(--color-blue)', dot: 'bg-(--color-blue)', border: 'border-(--color-blue)' }
    if (tone === 'bad') return { text: 'text-(--color-error)', dot: 'bg-(--color-error)', border: 'border-(--color-error)' }
    if (tone === 'neutral') return { text: 'text-(--color-warning)', dot: 'bg-(--color-warning)', border: 'border-(--color-warning)' }
    return { text: 'text-(--color-text-muted)', dot: 'bg-(--color-text-muted)', border: 'border-(--color-border)' }
}

function formatChange(value: number | null) {
    if (value == null) return 'no prior'
    const pct = Math.round(value * 100)
    return `${pct > 0 ? '+' : ''}${pct}%`
}

function TrendCard({ label, value, change, lowerIsBetter = false }: { label: string; value: string; change: number | null; lowerIsBetter?: boolean }) {
    // A rise is normally good (visitors/signups/revenue) but bad for errors.
    const improving = change == null || change === 0 ? null : (lowerIsBetter ? change < 0 : change > 0)
    const tone = improving == null ? 'text-(--color-text-muted)' : improving ? 'text-(--color-blue)' : 'text-(--color-error)'
    return (
        <div className="rounded-md bg-(--color-card) p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-(--color-text)">{value}</p>
            <p className={`mt-1 text-xs font-medium ${tone}`}>{formatChange(change)} vs prior</p>
        </div>
    )
}

export default function CommandCenterPanel({ pipelineId }: { pipelineId: string | null }) {
    const [data, setData] = useState<CommandCenterData | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!pipelineId) return
        let active = true
        void (async () => {
            setLoading(true)
            setError(null)
            try {
                const json = await fetchJson<ApiData<CommandCenterData>>(`/api/monitor/${pipelineId}/command-center`)
                if (active) setData(json?.data ?? null)
            } catch (err) {
                if (active) setError(err instanceof Error ? err.message : 'Could not load command center')
            } finally {
                if (active) setLoading(false)
            }
        })()
        return () => { active = false }
    }, [pipelineId])

    if (loading) return <p className="text-sm text-(--color-text-muted)">Loading command center…</p>
    if (error) return <p className="rounded-md border border-(--color-error) px-3 py-2 text-sm text-(--color-error)">{error}</p>
    if (!data) return <p className="text-sm text-(--color-text-muted)">No data yet.</p>

    const health = data.health
    const tone = toneClasses(HEALTH_TONE[health.state] ?? 'muted')
    const trends = data.trends
    const visitorsCur: TrendValue = trends.visitors

    return (
        <section className="flex flex-col gap-6">
            <SituationSummary pipelineId={pipelineId} data={data} />

            <div className={`flex items-center justify-between gap-4 rounded-md border bg-(--color-card) p-5 ${tone.border}`}>
                <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
                    <div>
                        <p className={`text-lg font-semibold ${tone.text}`}>{health.label}</p>
                        <p className="text-xs text-(--color-text-muted)">{health.reason}</p>
                    </div>
                </div>
                <div className="text-right text-xs text-(--color-text-muted)">
                    {data.signals.errorRate != null && <p>error rate {(data.signals.errorRate * 100).toFixed(1)}%</p>}
                    {data.signals.lcpRating && <p>LCP {data.signals.lcpRating}</p>}
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <TrendCard label={`Visitors (${data.growthWindowDays}d)`} value={String(visitorsCur.current)} change={visitorsCur.changePct} />
                <TrendCard label="Signups" value={String(trends.signups.current)} change={trends.signups.changePct} />
                <TrendCard label="Errors" value={String(trends.errors.current)} change={trends.errors.changePct} lowerIsBetter />
                <TrendCard
                    label="MRR"
                    value={data.revenueConnected && trends.revenue.current != null ? `$${(trends.revenue.current / 100).toFixed(0)}` : '—'}
                    change={trends.revenue.changePct}
                />
            </div>

            <section className="rounded-md bg-(--color-card)">
                <div className="border-b border-(--color-border) px-5 py-4">
                    <p className="text-sm font-semibold text-(--color-text)">Needs attention</p>
                    <p className="mt-1 text-xs text-(--color-text-muted)">Top open issues right now.</p>
                </div>
                <div className="divide-y divide-(--color-border)">
                    {data.topIssues.length ? data.topIssues.map(issue => (
                        <Link
                            key={issue.id}
                            href={`${routes.core.monitorErrors}?pipelineId=${pipelineId}`}
                            className="flex items-center gap-2 px-5 py-3 text-sm transition-colors hover:bg-(--color-bg)"
                        >
                            <Chip label={issue.level} tone={severityChipTone(toSeverity(issue.level))} />
                            <span className="min-w-0 flex-1 truncate text-(--color-text)" title={issue.title}>{issue.title}</span>
                            <span className="shrink-0 text-xs text-(--color-text-muted)">{issue.eventCount} events</span>
                        </Link>
                    )) : (
                        <p className="px-5 py-4 text-sm text-(--color-text-muted)">No open issues. All clear.</p>
                    )}
                </div>
            </section>
        </section>
    )
}
