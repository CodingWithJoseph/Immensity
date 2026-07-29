'use client'

import { useEffect, useState } from 'react'
import { formatDateTime } from '@/lib/format'
import { useSearchParams } from 'next/navigation'
import { fetchJson, ApiData } from '@/lib/fetchJson'
import type { SessionDetailData, SessionRow, SessionsMetrics, SessionTimelineItem } from '../types'


function formatTime(value: string | null) {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })
}

function eventLabel(item: SessionTimelineItem) {
    if (item.kind === 'error') return item.message ?? 'Error'
    if (item.eventType === 'custom') return item.name ?? 'custom event'
    return item.name ?? item.eventType ?? 'event'
}


function formatDuration(seconds: number) {
    if (seconds <= 0) return '0s'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    if (m === 0) return `${s}s`
    if (m < 60) return `${m}m ${s}s`
    const h = Math.floor(m / 60)
    return `${h}h ${m % 60}m`
}

function actorLabel(session: SessionRow) {
    if (session.userRef) return session.userRef
    return `anon ${(session.visitorId ?? '').slice(0, 8) || '—'}`
}

function Stat({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="rounded-md bg-(--color-card) p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-(--color-text)">{value}</p>
        </div>
    )
}

function SessionDetailView({ pipelineId, sessionId, onBack }: { pipelineId: string; sessionId: string; onBack: () => void }) {
    const [data, setData] = useState<SessionDetailData | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let active = true
        void (async () => {
            setLoading(true)
            setError(null)
            try {
                const json = await fetchJson<ApiData<SessionDetailData>>(`/api/monitor/${pipelineId}/sessions/${encodeURIComponent(sessionId)}`)
                if (active) setData(json?.data ?? null)
            } catch (err) {
                if (active) setError(err instanceof Error ? err.message : 'Could not load session')
            } finally {
                if (active) setLoading(false)
            }
        })()
        return () => { active = false }
    }, [pipelineId, sessionId])

    const session = data?.session
    const timeline = data?.timeline ?? []
    const actor = session?.userRef ?? (session?.visitorId ? `anon ${session.visitorId.slice(0, 8)}` : 'Unknown actor')

    return (
        <section className="flex flex-col gap-6">
            <button
                type="button"
                onClick={onBack}
                className="self-start text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted) transition-colors hover:text-(--color-text)"
            >
                ← Back to sessions
            </button>

            {loading && <p className="text-sm text-(--color-text-muted)">Loading session…</p>}
            {error && <p className="rounded-md border border-(--color-error) px-3 py-2 text-sm text-(--color-error)">{error}</p>}

            {!loading && !error && session && (
                <>
                    <div className="rounded-md bg-(--color-card) p-5">
                        <div className="flex items-center gap-2">
                            <span className={`h-1.5 w-1.5 rounded-full ${session.identified ? 'bg-(--color-success)' : 'bg-(--color-text-muted)'}`} />
                            <p className="text-sm font-semibold text-(--color-text)">{actor}</p>
                        </div>
                        <p className="mt-2 text-xs text-(--color-text-muted)">
                            {session.events} events · {session.pageviews} pageviews · {session.errors} errors · {formatDuration(session.durationSeconds)}
                        </p>
                    </div>

                    <section className="rounded-md bg-(--color-card)">
                        <div className="border-b border-(--color-border) px-5 py-4">
                            <p className="text-sm font-semibold text-(--color-text)">Timeline</p>
                            <p className="mt-1 text-xs text-(--color-text-muted)">Events and errors in order — the error shows up next to what they were doing.</p>
                        </div>
                        <div className="divide-y divide-(--color-border)">
                            {timeline.length ? timeline.map(item => (
                                <div key={item.id} className="grid grid-cols-[90px_minmax(0,1fr)] gap-3 px-5 py-3 text-sm">
                                    <span className="text-(--color-text-muted)">{formatTime(item.occurredAt)}</span>
                                    <span className="min-w-0">
                                        <span className={`flex items-center gap-2 ${item.kind === 'error' ? 'text-(--color-error)' : 'text-(--color-text)'}`}>
                                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.kind === 'error' ? 'bg-(--color-error)' : 'bg-(--color-text-muted)'}`} />
                                            <span className="truncate font-medium" title={eventLabel(item)}>{eventLabel(item)}</span>
                                        </span>
                                        {item.url && <span className="mt-0.5 block truncate text-xs text-(--color-text-muted)" title={item.url}>{item.url}</span>}
                                    </span>
                                </div>
                            )) : (
                                <p className="px-5 py-4 text-sm text-(--color-text-muted)">No activity in this session.</p>
                            )}
                        </div>
                    </section>
                </>
            )}
        </section>
    )
}

export default function SessionsPanel({ pipelineId }: { pipelineId: string | null }) {
    // Deep-link target: arriving from an issue's "affected sessions" opens that
    // session's timeline directly (issue → session → error in situ).
    const searchParams = useSearchParams()
    const [selected, setSelected] = useState<string | null>(searchParams.get('session'))
    const [data, setData] = useState<SessionsMetrics | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!pipelineId) return
        let active = true
        void (async () => {
            setLoading(true)
            setError(null)
            try {
                const json = await fetchJson<ApiData<SessionsMetrics>>(`/api/monitor/${pipelineId}/sessions`)
                if (active) setData(json?.data ?? null)
            } catch (err) {
                if (active) setError(err instanceof Error ? err.message : 'Could not load sessions')
            } finally {
                if (active) setLoading(false)
            }
        })()
        return () => { active = false }
    }, [pipelineId])

    const summary = data?.summary
    const windowDays = data?.windowDays ?? 14
    const sessions = data?.sessions ?? []
    const identifiedPct = summary && summary.totalSessions
        ? Math.round((summary.identifiedSessions / summary.totalSessions) * 100)
        : null

    if (selected && pipelineId) {
        return <SessionDetailView pipelineId={pipelineId} sessionId={selected} onBack={() => setSelected(null)} />
    }

    return (
        <section className="flex flex-col gap-6">
            {loading && <p className="text-sm text-(--color-text-muted)">Loading sessions…</p>}
            {error && <p className="rounded-md border border-(--color-error) px-3 py-2 text-sm text-(--color-error)">{error}</p>}

            {!loading && !error && (
                <>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Stat label={`Sessions (${windowDays}d)`} value={summary?.totalSessions ?? 0} />
                        <Stat
                            label="Identified"
                            value={identifiedPct != null ? `${summary?.identifiedSessions ?? 0} (${identifiedPct}%)` : (summary?.identifiedSessions ?? 0)}
                        />
                        <Stat label="Avg events / session" value={summary?.avgEventsPerSession ?? '—'} />
                    </div>

                    <section className="rounded-md bg-(--color-card)">
                        <div className="border-b border-(--color-border) px-5 py-4">
                            <p className="text-sm font-semibold text-(--color-text)">Recent sessions</p>
                            <p className="mt-1 text-xs text-(--color-text-muted)">Each row aggregates the events sharing a session — most recent first.</p>
                        </div>
                        <div className="grid grid-cols-[minmax(0,1fr)_80px_90px_140px] gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">
                            <span>Actor</span>
                            <span className="text-right">Events</span>
                            <span className="text-right">Duration</span>
                            <span className="text-right">Last active</span>
                        </div>
                        <div className="divide-y divide-(--color-border)">
                            {sessions.length ? sessions.map(session => (
                                <button
                                    key={session.sessionId}
                                    type="button"
                                    onClick={() => setSelected(session.sessionId)}
                                    className="grid w-full grid-cols-[minmax(0,1fr)_80px_90px_140px] gap-2 px-5 py-3 text-left text-sm transition-colors hover:bg-(--color-bg)"
                                >
                                    <span className="flex items-center gap-2 truncate">
                                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${session.identified ? 'bg-(--color-success)' : 'bg-(--color-text-muted)'}`} />
                                        <span className="truncate text-(--color-text)" title={actorLabel(session)}>{actorLabel(session)}</span>
                                    </span>
                                    <span className="text-right text-(--color-text-muted)">{session.events}</span>
                                    <span className="text-right text-(--color-text-muted)">{formatDuration(session.durationSeconds)}</span>
                                    <span className="text-right text-(--color-text-muted)">{formatDateTime(session.endedAt)}</span>
                                </button>
                            )) : (
                                <p className="px-5 py-4 text-sm text-(--color-text-muted)">No sessions in this window yet.</p>
                            )}
                        </div>
                    </section>
                </>
            )}
        </section>
    )
}
