'use client'

import { useEffect, useState } from 'react'
import { fetchJson, ApiData } from '@/lib/fetchJson'
import type { CommandCenterData, TimeseriesData } from '../types'

type Tone = 'bad' | 'neutral' | 'good'

const ACCENT: Record<Tone, string> = {
    bad: 'bg-(--color-error)',
    neutral: 'bg-(--color-warning)',
    good: 'bg-(--color-blue)',
}
const STROKE: Record<Tone, string> = {
    bad: 'stroke-(--color-error)',
    neutral: 'stroke-(--color-warning)',
    good: 'stroke-(--color-blue)',
}

function pctLabel(value: number | null): string {
    if (value == null) return '—'
    const p = Math.round(value * 100)
    return `${p > 0 ? '+' : ''}${p}%`
}

// The plain-language situation, synthesised from the command-center signals.
// Picks the single most important story (error spike > signup slide > healthy)
// so the lead is one clear sentence, not a wall of numbers.
export function narrate(data: CommandCenterData): { headline: string; detail: string; tone: Tone } {
    const errors = data.trends.errors
    const signups = data.trends.signups
    const top = data.topIssues[0]
    const mult = errors.previous > 0 ? errors.current / errors.previous : null
    const errorsSpiking = (errors.changePct != null && errors.changePct > 0.5) || (mult != null && mult >= 1.8)

    if (errorsSpiking) {
        const headline = mult != null && mult >= 1.5
            ? `Errors are running ${mult.toFixed(mult >= 10 ? 0 : 1)}× their usual level.`
            : `Error volume is climbing (${pctLabel(errors.changePct)} vs the prior period).`
        const cause = top?.lastRelease ? `, lining up with ${top.lastRelease}` : ''
        const contributor = top ? `“${top.title}” is the biggest contributor (${top.eventCount.toLocaleString()} events)${cause}.` : ''
        const impact = data.signals.errorRate != null ? ` ${(data.signals.errorRate * 100).toFixed(1)}% of sessions hit an error.` : ''
        return { headline, detail: `${contributor}${impact}`.trim(), tone: 'bad' }
    }

    if (signups.changePct != null && signups.changePct < -0.1) {
        return {
            headline: `Signups are down ${Math.abs(Math.round(signups.changePct * 100))}% week-over-week.`,
            detail: `${signups.current.toLocaleString()} this period versus ${signups.previous.toLocaleString()} before — worth a look before it compounds.`,
            tone: 'neutral',
        }
    }

    return {
        headline: 'Everything looks healthy.',
        detail: 'No error spike and the key metrics are holding steady over the window.',
        tone: 'good',
    }
}

function Sparkline({ values, tone }: { values: number[]; tone: Tone }) {
    if (values.length < 2) return null
    const w = 120
    const h = 36
    const max = Math.max(...values, 1)
    const step = w / (values.length - 1)
    const points = values.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 2) - 1).toFixed(1)}`).join(' ')
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={STROKE[tone]} aria-hidden>
            <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    )
}

function Evidence({ label, value, change, lowerIsBetter = false }: { label: string; value: string; change: number | null; lowerIsBetter?: boolean }) {
    const improving = change == null || change === 0 ? null : (lowerIsBetter ? change < 0 : change > 0)
    const tone = improving == null ? 'text-(--color-text-muted)' : improving ? 'text-(--color-blue)' : 'text-(--color-error)'
    return (
        <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted)">{label}</p>
            <p className="mt-0.5 text-lg font-semibold text-(--color-text)">{value}</p>
            <p className={`text-[11px] font-medium ${tone}`}>{pctLabel(change)}</p>
        </div>
    )
}

export default function SituationSummary({ pipelineId, data }: { pipelineId: string | null; data: CommandCenterData }) {
    const [series, setSeries] = useState<TimeseriesData | null>(null)

    useEffect(() => {
        if (!pipelineId) return
        let active = true
        void (async () => {
            const json = await fetchJson<ApiData<TimeseriesData>>(`/api/monitor/${pipelineId}/timeseries?metric=errors`)
            if (active) setSeries(json?.data ?? null)
        })()
        return () => { active = false }
    }, [pipelineId])

    const { headline, detail, tone } = narrate(data)
    const spark = series?.points.map(p => p.value) ?? []

    return (
        <section className="flex overflow-hidden rounded-md bg-(--color-card)">
            <div className={`w-1 shrink-0 ${ACCENT[tone]}`} aria-hidden />
            <div className="flex min-w-0 flex-1 flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted)">Situation</p>
                    <p className="mt-1 text-base font-semibold text-(--color-text)">{headline}</p>
                    {detail && <p className="mt-1 text-sm text-(--color-text-muted)">{detail}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-5">
                    <Evidence label="Errors" value={data.trends.errors.current.toLocaleString()} change={data.trends.errors.changePct} lowerIsBetter />
                    <Evidence label="Signups" value={data.trends.signups.current.toLocaleString()} change={data.trends.signups.changePct} />
                    {spark.length >= 2 && (
                        <div className="hidden sm:block">
                            <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted)">Errors / day</p>
                            <Sparkline values={spark} tone={tone} />
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
