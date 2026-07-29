'use client'

import { useEffect, useState } from 'react'
import { fetchJson, ApiData } from '@/lib/fetchJson'
import type { ErrorEvent, TraceData, TraceSpan } from '../types'


function fmtDuration(ms: number | null) {
    if (ms == null) return '—'
    if (ms < 1) return '<1ms'
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(2)}s`
}

function KindBadge({ kind }: { kind: string }) {
    // server is the backend half of the chain — give it the accent.
    const tone = kind === 'server'
        ? 'border-(--color-text) text-(--color-text)'
        : 'border-(--color-border) text-(--color-text-muted)'
    return <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${tone}`}>{kind}</span>
}

function StatusDot({ status }: { status: string | null }) {
    const tone = status === 'error' ? 'bg-(--color-error)' : status === 'ok' ? 'bg-(--color-success)' : 'bg-(--color-text-muted)'
    return <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone}`} title={status ?? 'unknown'} />
}

function PinnedError({ error }: { error: ErrorEvent }) {
    return (
        <div className="mt-1 flex items-start gap-2 rounded border border-(--color-error) bg-(--color-error)/5 px-2 py-1">
            <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-(--color-error)">error</span>
            <span className="min-w-0 flex-1 truncate text-xs text-(--color-text)" title={error.message}>{error.message}</span>
        </div>
    )
}

function SpanRow({ span, errors }: { span: TraceSpan; errors: ErrorEvent[] }) {
    return (
        <div className="px-4 py-2" style={{ paddingLeft: `${16 + span.depth * 18}px` }}>
            <div className="flex items-center gap-2">
                <StatusDot status={span.status} />
                <KindBadge kind={span.kind} />
                <span className="min-w-0 flex-1 truncate text-sm text-(--color-text)" title={span.name}>{span.name}</span>
                {span.service && <span className="shrink-0 text-xs text-(--color-text-muted)">{span.service}</span>}
                <span className="shrink-0 tabular-nums text-xs text-(--color-text-muted)">{fmtDuration(span.durationMs)}</span>
            </div>
            {errors.map(err => <PinnedError key={err.id} error={err} />)}
        </div>
    )
}

export default function TraceView({ pipelineId, traceId, onBack }: { pipelineId: string; traceId: string; onBack: () => void }) {
    const [data, setData] = useState<TraceData | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let active = true
        void (async () => {
            setLoading(true)
            setError(null)
            try {
                const json = await fetchJson<ApiData<TraceData>>(`/api/monitor/${pipelineId}/traces/${encodeURIComponent(traceId)}`)
                if (active) setData(json?.data ?? null)
            } catch (err) {
                if (active) setError(err instanceof Error ? err.message : 'Could not load trace')
            } finally {
                if (active) setLoading(false)
            }
        })()
        return () => { active = false }
    }, [pipelineId, traceId])

    const spans = data?.spans ?? []
    const summary = data?.summary
    // Pin each error to the span it fired in; the rest are listed below the tree.
    const errorsBySpan = new Map<string, ErrorEvent[]>()
    const looseErrors: ErrorEvent[] = []
    const spanIds = new Set(spans.map(s => s.spanId))
    for (const err of data?.errors ?? []) {
        if (err.spanId && spanIds.has(err.spanId)) {
            const list = errorsBySpan.get(err.spanId) ?? []
            list.push(err)
            errorsBySpan.set(err.spanId, list)
        } else {
            looseErrors.push(err)
        }
    }

    return (
        <section className="flex flex-col gap-4">
            <button
                type="button"
                onClick={onBack}
                className="self-start text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted) transition-colors hover:text-(--color-text)"
            >
                ← Back
            </button>

            <div className="rounded-md bg-(--color-card)">
                <div className="border-b border-(--color-border) px-5 py-4">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-(--color-text)">Trace</p>
                        {summary?.hasServer && (
                            <span className="rounded-full border border-(--color-text) px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-(--color-text)">frontend → backend</span>
                        )}
                    </div>
                    <p className="mt-1 font-mono text-xs text-(--color-text-muted)" title={traceId}>{traceId}</p>
                    {summary && (
                        <p className="mt-1 text-xs text-(--color-text-muted)">
                            {summary.spanCount} {summary.spanCount === 1 ? 'span' : 'spans'}
                            {` · ${summary.errorCount} ${summary.errorCount === 1 ? 'error' : 'errors'}`}
                            {summary.services.length ? ` · ${summary.services.join(', ')}` : ''}
                            {summary.durationMs != null ? ` · ${fmtDuration(summary.durationMs)}` : ''}
                        </p>
                    )}
                </div>

                {loading && <p className="px-5 py-4 text-sm text-(--color-text-muted)">Loading trace…</p>}
                {error && <p className="px-5 py-4 text-sm text-(--color-error)">{error}</p>}
                {!loading && !error && (
                    <div className="divide-y divide-(--color-border)">
                        {spans.length ? spans.map(span => (
                            <SpanRow key={span.id} span={span} errors={errorsBySpan.get(span.spanId) ?? []} />
                        )) : (
                            <p className="px-5 py-4 text-sm text-(--color-text-muted)">No spans for this trace. Enable tracing (data-trace) on the beacon to capture the chain.</p>
                        )}
                    </div>
                )}
            </div>

            {looseErrors.length > 0 && (
                <div className="rounded-md bg-(--color-card)">
                    <div className="border-b border-(--color-border) px-5 py-4">
                        <p className="text-sm font-semibold text-(--color-text)">Errors in this trace</p>
                    </div>
                    <div className="divide-y divide-(--color-border)">
                        {looseErrors.map(err => (
                            <p key={err.id} className="truncate px-5 py-3 text-sm text-(--color-text)" title={err.message}>{err.message}</p>
                        ))}
                    </div>
                </div>
            )}
        </section>
    )
}
