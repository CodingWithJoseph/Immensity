'use client'

import { useEffect, useState } from 'react'
import { formatDateTime } from '@/lib/format'
import { fetchJson, ApiData } from '@/lib/fetchJson'
import Chip from '@/app/(core)/dashboard/components/Chip'
import { toSeverity, severityChipTone } from '@/lib/monitoring/taxonomy'
import type { MonitoringProblem, ProblemDetailData, ProblemsData } from '../types'



function SeverityBadge({ severity }: { severity: MonitoringProblem['severity'] }) {
    return <Chip label={severity} tone={severityChipTone(toSeverity(severity))} />
}

function ImpactBar({ label, value, max }: { label: string; value: number | null; max: number }) {
    const width = value != null && max > 0 ? Math.round((value / max) * 100) : 0
    return (
        <div>
            <div className="flex items-center justify-between text-xs text-(--color-text-muted)">
                <span>{label}</span>
                <span className="font-medium text-(--color-text)">{value ?? '—'}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-(--color-bg)">
                <div className="h-2 rounded-full bg-(--color-text-muted)" style={{ width: `${width}%` }} />
            </div>
        </div>
    )
}

function ProblemDetailView({ pipelineId, problemId, onBack }: { pipelineId: string; problemId: string; onBack: () => void }) {
    const [data, setData] = useState<ProblemDetailData | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        let active = true
        void (async () => {
            setLoading(true)
            const json = await fetchJson<ApiData<ProblemDetailData>>(`/api/monitor/${pipelineId}/problems/${encodeURIComponent(problemId)}`)
            if (active) { setData(json?.data ?? null); setLoading(false) }
        })()
        return () => { active = false }
    }, [pipelineId, problemId])

    const problem = data?.problem
    const impact = data?.impact
    const eventBased = impact && (impact.metric === 'errors' || impact.metric === 'signups')
    const max = impact ? Math.max(impact.before ?? 0, impact.during ?? 0, impact.after ?? 0, 1) : 1

    return (
        <section className="flex flex-col gap-5">
            <button type="button" onClick={onBack} className="self-start text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted) transition-colors hover:text-(--color-text)">
                ← Back to problems
            </button>

            {loading && <p className="text-sm text-(--color-text-muted)">Loading problem…</p>}

            {!loading && problem && (
                <>
                    <div className="rounded-md bg-(--color-card) p-5">
                        <div className="flex items-center gap-2">
                            <SeverityBadge severity={problem.severity} />
                            <span className="text-sm font-semibold text-(--color-text)">{problem.title}</span>
                        </div>
                        {problem.detail && <p className="mt-2 text-xs text-(--color-text-muted)">{problem.detail}</p>}
                        <p className="mt-1 text-xs text-(--color-text-muted)">Detected {formatDateTime(problem.detectedAt)} · {problem.status}</p>
                    </div>

                    <section className="rounded-md bg-(--color-card) p-5">
                        <p className="text-sm font-semibold text-(--color-text)">Impact</p>
                        {eventBased ? (
                            <>
                                <p className="mt-1 text-xs text-(--color-text-muted)">{impact!.metric} in {impact!.windowHours}h windows around detection.</p>
                                <div className="mt-4 flex flex-col gap-3">
                                    <ImpactBar label="Before" value={impact!.before} max={max} />
                                    <ImpactBar label="During" value={impact!.during} max={max} />
                                    <ImpactBar label="After" value={impact!.after} max={max} />
                                </div>
                            </>
                        ) : (
                            <p className="mt-2 text-sm text-(--color-text-muted)">
                                Baseline <span className="font-medium text-(--color-text)">{problem.baseline ?? '—'}</span> → observed <span className="font-medium text-(--color-text)">{problem.observed ?? '—'}</span>.
                            </p>
                        )}
                    </section>
                </>
            )}
        </section>
    )
}

export default function ProblemsPanel({ pipelineId }: { pipelineId: string | null }) {
    const [problems, setProblems] = useState<MonitoringProblem[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [selected, setSelected] = useState<string | null>(null)

    useEffect(() => {
        if (!pipelineId) return
        let active = true
        void (async () => {
            try {
                const json = await fetchJson<ApiData<ProblemsData>>(`/api/monitor/${pipelineId}/problems`)
                if (active) setProblems(json?.data.problems ?? [])
            } catch (err) {
                if (active) setError(err instanceof Error ? err.message : 'Could not load problems')
            }
        })()
        return () => { active = false }
    }, [pipelineId])

    if (selected && pipelineId) {
        return <ProblemDetailView pipelineId={pipelineId} problemId={selected} onBack={() => setSelected(null)} />
    }

    return (
        <section className="rounded-md bg-(--color-card)">
            <div className="border-b border-(--color-border) px-5 py-4">
                <p className="text-sm font-semibold text-(--color-text)">Problems</p>
                <p className="mt-1 text-xs text-(--color-text-muted)">Conditions the monitor flagged — open one for its before/during/after impact.</p>
            </div>
            {error && <p className="px-5 py-4 text-sm text-(--color-error)">{error}</p>}
            <div className="divide-y divide-(--color-border)">
                {problems === null && <p className="px-5 py-4 text-sm text-(--color-text-muted)">Loading…</p>}
                {problems?.length === 0 && <p className="px-5 py-4 text-sm text-(--color-text-muted)">No problems flagged. All clear.</p>}
                {problems?.map(problem => (
                    <button
                        key={problem.id}
                        type="button"
                        onClick={() => setSelected(problem.id)}
                        className="flex w-full flex-col gap-1 px-5 py-3 text-left transition-colors hover:bg-(--color-bg)"
                    >
                        <div className="flex items-center gap-2">
                            <SeverityBadge severity={problem.severity} />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-(--color-text)" title={problem.title}>{problem.title}</span>
                            <span className="shrink-0 text-xs text-(--color-text-muted)">{formatDateTime(problem.detectedAt)}</span>
                        </div>
                        {problem.detail && <span className="truncate text-xs text-(--color-text-muted)">{problem.detail}</span>}
                    </button>
                ))}
            </div>
        </section>
    )
}
