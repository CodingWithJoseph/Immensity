'use client'

import { useEffect, useState } from 'react'
import { fetchJson, ApiData } from '@/lib/fetchJson'
import type { CorrelationCandidate, RevenueCorrelation } from '../types'


function humanize(behavior: string): string {
    const map: Record<string, string> = {
        pageview: 'viewed a page',
        signup: 'signed up',
        login: 'logged in',
        activation: 'activated',
        custom: 'fired a custom event',
    }
    return map[behavior] ?? behavior.replace(/_/g, ' ')
}

function CandidateRow({ c }: { c: CorrelationCandidate }) {
    const [showMath, setShowMath] = useState(false)
    const expand = c.direction === 'expansion'
    const likelihood = expand ? c.expandLikelihood : c.churnLikelihood
    const tone = expand ? 'text-(--color-blue)' : 'text-(--color-error)'
    const chip = expand ? 'border-(--color-blue) text-(--color-blue)' : 'border-(--color-error) text-(--color-error)'
    const strong = (c.pValue ?? 1) <= 0.05

    return (
        <div className="rounded-md border border-(--color-border) bg-(--color-bg) p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm text-(--color-text)">
                    Customers who <span className="font-semibold">{humanize(c.behavior)}</span> are{' '}
                    <span className={`font-semibold ${tone}`}>{likelihood ?? c.oddsRatio}× more likely</span>{' '}
                    to {expand ? 'expand' : 'churn'}.
                </p>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${chip}`}>
                    {strong ? 'strong signal' : 'directional'}
                </span>
            </div>
            <button
                type="button"
                onClick={() => setShowMath(v => !v)}
                className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted) transition-colors hover:text-(--color-text)"
            >
                {showMath ? '− Hide math' : '+ Show the math'}
            </button>
            {showMath && (
                <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-(--color-text-muted) sm:grid-cols-4">
                    <span>did + positive: <span className="font-medium text-(--color-text)">{c.a}</span></span>
                    <span>did + negative: <span className="font-medium text-(--color-text)">{c.b}</span></span>
                    <span>didn’t + positive: <span className="font-medium text-(--color-text)">{c.c}</span></span>
                    <span>didn’t + negative: <span className="font-medium text-(--color-text)">{c.d}</span></span>
                    <span>odds ratio: <span className="font-medium text-(--color-text)">{c.oddsRatio}</span></span>
                    {c.pValue != null && <span>p-value: <span className="font-medium text-(--color-text)">{c.pValue}</span></span>}
                </div>
            )}
        </div>
    )
}

export default function RevenueInsightsPanel({ pipelineId }: { pipelineId: string | null }) {
    const [data, setData] = useState<RevenueCorrelation | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!pipelineId) return
        let active = true
        void (async () => {
            setLoading(true)
            setError(null)
            try {
                const json = await fetchJson<ApiData<RevenueCorrelation>>(`/api/portfolio/${pipelineId}/insights/revenue-correlation?outcomeWindowDays=90`)
                if (active) setData(json?.data ?? null)
            } catch (err) {
                if (active) setError(err instanceof Error ? err.message : 'Could not load insights')
            } finally {
                if (active) setLoading(false)
            }
        })()
        return () => { active = false }
    }, [pipelineId])

    const candidates = data?.candidates ?? []
    const cohort = data?.cohort
    const expanders = candidates.filter(c => c.direction === 'expansion')
    const churners = candidates.filter(c => c.direction === 'churn')

    return (
        <section className="flex flex-col gap-5 rounded-md bg-(--color-card) p-5">
            {loading && <p className="text-sm text-(--color-text-muted)">Analyzing behavior against revenue outcomes…</p>}
            {error && <p className="rounded-md border border-(--color-error) px-3 py-2 text-sm text-(--color-error)">{error}</p>}

            {!loading && !error && data && (
                <>
                    {cohort && (
                        <div className="flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full border border-(--color-border) bg-(--color-bg) px-3 py-1 text-(--color-text-muted)">
                                <span className="font-semibold text-(--color-text)">{cohort.labeled}</span> customers analyzed
                            </span>
                            <span className="rounded-full border border-(--color-border) bg-(--color-bg) px-3 py-1 text-(--color-text-muted)">
                                <span className="font-semibold text-(--color-text)">{cohort.positive}</span> retained/expanded
                            </span>
                            <span className="rounded-full border border-(--color-border) bg-(--color-bg) px-3 py-1 text-(--color-text-muted)">
                                <span className="font-semibold text-(--color-text)">{cohort.negative}</span> churned/contracted
                            </span>
                            <span className="rounded-full border border-(--color-border) bg-(--color-bg) px-3 py-1 text-(--color-text-muted)">
                                {data.resolvedCustomers} joined to Stripe
                            </span>
                        </div>
                    )}

                    {/* coaching: when guardrails leave nothing to show */}
                    {candidates.length === 0 && (
                        <div className="rounded-md border border-dashed border-(--color-border) bg-(--color-bg) p-4 text-sm text-(--color-text-muted)">
                            {data.caveats?.length
                                ? data.caveats.join(' ')
                                : 'No behavior reached the confidence bar yet. Identify more customers (via the tracker’s identify call) and let more outcomes accrue to unlock predictors.'}
                        </div>
                    )}

                    {expanders.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-blue)">Predicts expansion</p>
                            {expanders.map(c => <CandidateRow key={`e-${c.behavior}`} c={c} />)}
                        </div>
                    )}

                    {churners.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">Predicts churn</p>
                            {churners.map(c => <CandidateRow key={`c-${c.behavior}`} c={c} />)}
                        </div>
                    )}

                    {/* honesty: show what was dropped and why */}
                    {data.caveats?.length > 0 && candidates.length > 0 && (
                        <p className="text-xs text-(--color-text-muted)">{data.caveats.join(' · ')}</p>
                    )}
                    {data.dropped?.length > 0 && (
                        <p className="text-[11px] text-(--color-text-faint)">
                            {data.dropped.length} candidate{data.dropped.length === 1 ? '' : 's'} dropped by guardrails (too few people, no signal, or skewed outcomes).
                        </p>
                    )}
                </>
            )}

            {!loading && !error && !data && pipelineId && (
                <p className="rounded-md border border-dashed border-(--color-border) bg-(--color-bg) p-4 text-sm text-(--color-text-muted)">
                    No insights available yet. They appear once usage events are joined to paying customers and enough revenue outcomes accrue.
                </p>
            )}

            {!pipelineId && <p className="text-sm text-(--color-text-muted)">Select a launched product to see insights.</p>}
        </section>
    )
}
