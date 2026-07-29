'use client'

import { useEffect, useState } from 'react'
import { formatDateTime } from '@/lib/format'
import Link from 'next/link'
import { fetchJson, ApiData } from '@/lib/fetchJson'
import { routes } from '@/app/util/routes'
import Chip from '@/app/(core)/dashboard/components/Chip'
import { toSeverity, severityChipTone } from '@/lib/monitoring/taxonomy'
import TraceView from './TraceView'
import type { AffectedSession, DimensionFacetItem, IssueDetailData, IssueFacetItem, IssueObject, IssuesMetrics, IssueSessionsData, IssueTrend } from '../types'



function TrendBadge({ trend }: { trend: IssueTrend }) {
    if (trend.direction === 'flat') {
        return <span className="text-xs text-(--color-text-muted)">flat</span>
    }
    const worsening = trend.direction === 'up'
    const arrow = worsening ? '▲' : '▼'
    // Up = more occurrences than the prior half = worse, so flag it with error.
    const tone = worsening ? 'text-(--color-error)' : 'text-(--color-blue)'
    const pct = trend.changePct == null ? '' : ` ${Math.abs(Math.round(trend.changePct * 100))}%`
    return <span className={`text-xs font-medium ${tone}`}>{arrow}{pct}</span>
}

function LevelBadge({ level }: { level: 'error' | 'warning' }) {
    return <Chip label={level} tone={severityChipTone(toSeverity(level))} />
}

function IssueRow({ issue, onSelect }: { issue: IssueObject; onSelect: () => void }) {
    return (
        <button type="button" onClick={onSelect} className="flex w-full flex-col gap-1 p-5 text-left transition-colors hover:bg-(--color-bg)">
            <div className="flex items-center gap-2">
                <LevelBadge level={issue.level} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-(--color-text)" title={issue.title}>{issue.title}</span>
                <TrendBadge trend={issue.trend} />
            </div>
            <p className="text-xs text-(--color-text-muted)">
                <span className="font-medium text-(--color-text)">{issue.affectedUsers}</span> {issue.affectedUsers === 1 ? 'user' : 'users'}
                {` · ${issue.affectedSessions} sessions`}
                {` · ${issue.occurrences} ${issue.occurrences === 1 ? 'occurrence' : 'occurrences'}`}
                {issue.errorType ? ` · ${issue.errorType}` : ''}
                {issue.lastRelease ? ` · ${issue.lastRelease}` : ''}
                {` · last seen ${formatDateTime(issue.lastSeenAt, 'Not yet')}`}
            </p>
        </button>
    )
}

function StatusButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="rounded-md border border-(--color-border) px-3 py-1.5 text-xs font-medium text-(--color-text) transition-colors hover:bg-(--color-bg) disabled:opacity-50"
        >
            {label}
        </button>
    )
}

function FacetTable({ title, items }: { title: string; items: IssueFacetItem[] }) {
    return (
        <div className="rounded-md border border-(--color-border)">
            <div className="grid grid-cols-[minmax(0,1fr)_70px_70px] gap-2 border-b border-(--color-border) px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted)">
                <span>{title}</span>
                <span className="text-right">Events</span>
                <span className="text-right">Users</span>
            </div>
            <div className="divide-y divide-(--color-border)">
                {items.length ? items.map(item => (
                    <div key={item.value} className="grid grid-cols-[minmax(0,1fr)_70px_70px] gap-2 px-4 py-2 text-sm">
                        <span className="truncate text-(--color-text)" title={item.value}>{item.value}</span>
                        <span className="text-right text-(--color-text-muted)">{item.count}</span>
                        <span className="text-right text-(--color-text-muted)">{item.users}</span>
                    </div>
                )) : (
                    <p className="px-4 py-2 text-sm text-(--color-text-muted)">No data.</p>
                )}
            </div>
        </div>
    )
}

function actorLabel(session: AffectedSession) {
    if (session.userRef) return session.userRef
    return `anon ${(session.visitorId ?? '').slice(0, 8) || '—'}`
}

function AffectedSessions({ pipelineId, issueId }: { pipelineId: string; issueId: string }) {
    const [sessions, setSessions] = useState<AffectedSession[] | null>(null)

    useEffect(() => {
        let active = true
        void (async () => {
            const json = await fetchJson<ApiData<IssueSessionsData>>(`/api/monitor/${pipelineId}/issues/${encodeURIComponent(issueId)}/sessions`)
            if (active) setSessions(json?.data.sessions ?? [])
        })()
        return () => { active = false }
    }, [pipelineId, issueId])

    return (
        <section className="rounded-md bg-(--color-card)">
            <div className="border-b border-(--color-border) px-5 py-4">
                <p className="text-sm font-semibold text-(--color-text)">Affected sessions</p>
                <p className="mt-1 text-xs text-(--color-text-muted)">Open a session to see this error in situ on its timeline.</p>
            </div>
            <div className="divide-y divide-(--color-border)">
                {sessions === null && <p className="px-5 py-4 text-sm text-(--color-text-muted)">Loading…</p>}
                {sessions?.length === 0 && <p className="px-5 py-4 text-sm text-(--color-text-muted)">No sessions tied to this issue.</p>}
                {sessions?.map(session => (
                    <Link
                        key={session.sessionId}
                        href={`${routes.core.monitorSessions}?pipelineId=${pipelineId}&session=${encodeURIComponent(session.sessionId)}`}
                        className="grid grid-cols-[minmax(0,1fr)_110px] gap-2 px-5 py-3 text-sm transition-colors hover:bg-(--color-bg)"
                    >
                        <span className="flex items-center gap-2 truncate">
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${session.identified ? 'bg-(--color-success)' : 'bg-(--color-text-muted)'}`} />
                            <span className="truncate text-(--color-text)" title={actorLabel(session)}>{actorLabel(session)}</span>
                        </span>
                        <span className="text-right text-(--color-text-muted)">{session.occurrences} {session.occurrences === 1 ? 'hit' : 'hits'}</span>
                    </Link>
                ))}
            </div>
        </section>
    )
}

function IssueDetailView({ pipelineId, issueId, onBack }: { pipelineId: string; issueId: string; onBack: () => void }) {
    const [data, setData] = useState<IssueDetailData | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [mutating, setMutating] = useState(false)
    const [viewingTrace, setViewingTrace] = useState<string | null>(null)

    async function setStatus(next: 'unresolved' | 'resolved' | 'ignored') {
        setMutating(true)
        try {
            const json = await fetchJson<ApiData<{ id: string; status: string }>>(
                `/api/monitor/${pipelineId}/issues/${encodeURIComponent(issueId)}`,
                { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }) },
            )
            if (json) setData(prev => (prev ? { ...prev, issue: { ...prev.issue, status: next } } : prev))
        } finally {
            setMutating(false)
        }
    }

    useEffect(() => {
        let active = true
        void (async () => {
            setLoading(true)
            setError(null)
            try {
                const json = await fetchJson<ApiData<IssueDetailData>>(`/api/monitor/${pipelineId}/issues/${encodeURIComponent(issueId)}`)
                if (active) setData(json?.data ?? null)
            } catch (err) {
                if (active) setError(err instanceof Error ? err.message : 'Could not load issue')
            } finally {
                if (active) setLoading(false)
            }
        })()
        return () => { active = false }
    }, [pipelineId, issueId])

    const issue = data?.issue
    const sample = data?.sample
    const occurrences = data?.recentOccurrences ?? []

    if (viewingTrace) {
        return <TraceView pipelineId={pipelineId} traceId={viewingTrace} onBack={() => setViewingTrace(null)} />
    }

    return (
        <section className="flex flex-col gap-5">
            <button
                type="button"
                onClick={onBack}
                className="self-start text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted) transition-colors hover:text-(--color-text)"
            >
                ← Back to issues
            </button>

            {loading && <p className="text-sm text-(--color-text-muted)">Loading issue…</p>}
            {error && <p className="rounded-md border border-(--color-error) px-3 py-2 text-sm text-(--color-error)">{error}</p>}

            {!loading && !error && issue && (
                <>
                    <div className="rounded-md bg-(--color-card) p-5">
                        <div className="flex items-center gap-2">
                            <LevelBadge level={issue.level} />
                            <span className="min-w-0 flex-1 text-sm font-semibold text-(--color-text)">{issue.title}</span>
                            <TrendBadge trend={issue.trend} />
                        </div>
                        <p className="mt-2 text-xs text-(--color-text-muted)">
                            <span className="font-medium text-(--color-text)">{issue.affectedUsers}</span> users · {issue.affectedSessions} sessions · {issue.occurrences} occurrences
                            {issue.lastRelease ? ` · ${issue.lastRelease}` : ''} · {issue.status}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {issue.status !== 'resolved' && <StatusButton label="Resolve" onClick={() => setStatus('resolved')} disabled={mutating} />}
                            {issue.status !== 'unresolved' && <StatusButton label="Reopen" onClick={() => setStatus('unresolved')} disabled={mutating} />}
                            {issue.status !== 'ignored' && <StatusButton label="Ignore" onClick={() => setStatus('ignored')} disabled={mutating} />}
                        </div>
                    </div>

                    {sample && (
                        <div className="rounded-md bg-(--color-card)">
                            <div className="border-b border-(--color-border) px-5 py-4">
                                <p className="text-sm font-semibold text-(--color-text)">Sample stack</p>
                            </div>
                            <div className="p-5">
                                <p className="text-sm font-medium text-(--color-text)">{sample.message}</p>
                                {sample.stack && (
                                    <pre className="mt-2 overflow-x-auto rounded-md bg-(--color-bg) p-3 text-xs text-(--color-text-muted)">{sample.stack}</pre>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="grid gap-4 lg:grid-cols-2">
                        <FacetTable title="By release" items={data?.facets.release ?? []} />
                        <FacetTable title="By page" items={data?.facets.url ?? []} />
                    </div>

                    <AffectedSessions pipelineId={pipelineId} issueId={issueId} />

                    <section className="rounded-md bg-(--color-card)">
                        <div className="border-b border-(--color-border) px-5 py-4">
                            <p className="text-sm font-semibold text-(--color-text)">Recent occurrences</p>
                        </div>
                        <div className="divide-y divide-(--color-border)">
                            {occurrences.length ? occurrences.map(event => (
                                <div key={event.id} className="grid gap-2 p-5 text-sm md:grid-cols-[minmax(0,1fr)_120px_140px_72px]">
                                    <span className="truncate text-(--color-text-muted)" title={event.url ?? ''}>{event.url || 'No URL'}</span>
                                    <span className="text-(--color-text-muted)">{event.release || '—'}</span>
                                    <span className="text-(--color-text-muted)">{formatDateTime(event.occurredAt, 'Not yet')}</span>
                                    {event.traceId ? (
                                        <button
                                            type="button"
                                            onClick={() => setViewingTrace(event.traceId as string)}
                                            className="justify-self-start text-xs font-medium text-(--color-text) underline-offset-2 transition-colors hover:underline"
                                        >
                                            trace →
                                        </button>
                                    ) : <span className="text-(--color-text-muted)">—</span>}
                                </div>
                            )) : (
                                <p className="p-5 text-sm text-(--color-text-muted)">No recent occurrences.</p>
                            )}
                        </div>
                    </section>
                </>
            )}
        </section>
    )
}

function DimensionFilter({ label, items, active, onChange }: { label: string; items: DimensionFacetItem[]; active: string | null; onChange: (value: string | null) => void }) {
    if (!items.length) return null
    return (
        <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted)">{label}</span>
            {items.map(item => {
                const selected = active === item.value
                return (
                    <button
                        key={item.value}
                        type="button"
                        onClick={() => onChange(selected ? null : item.value)}
                        aria-pressed={selected}
                        className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${selected ? 'border-(--color-text) bg-(--color-bg) font-medium text-(--color-text)' : 'border-(--color-border) text-(--color-text-muted) hover:bg-(--color-bg)'}`}
                    >
                        {item.value} <span className="text-(--color-text-muted)">{item.count}</span>
                    </button>
                )
            })}
        </div>
    )
}

export default function IssuesPanel({ pipelineId }: { pipelineId: string | null }) {
    const [data, setData] = useState<IssuesMetrics | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selected, setSelected] = useState<string | null>(null)
    const [errorType, setErrorType] = useState<string | null>(null)
    const [platform, setPlatform] = useState<string | null>(null)

    useEffect(() => {
        if (!pipelineId) return
        let active = true
        void (async () => {
            setLoading(true)
            setError(null)
            try {
                const qs = new URLSearchParams()
                if (errorType) qs.set('errorType', errorType)
                if (platform) qs.set('platform', platform)
                const suffix = qs.toString() ? `?${qs.toString()}` : ''
                const json = await fetchJson<ApiData<IssuesMetrics>>(`/api/monitor/${pipelineId}/issues${suffix}`)
                if (active) setData(json?.data ?? null)
            } catch (err) {
                if (active) setError(err instanceof Error ? err.message : 'Could not load issues')
            } finally {
                if (active) setLoading(false)
            }
        })()
        return () => { active = false }
    }, [pipelineId, errorType, platform])

    const windowDays = data?.windowDays ?? 14
    const issues = data?.issues ?? []
    const facets = data?.facets
    const hasFilters = Boolean(facets && (facets.errorType.length || facets.platform.length))
    const filterActive = Boolean(errorType || platform)

    if (selected && pipelineId) {
        return <IssueDetailView pipelineId={pipelineId} issueId={selected} onBack={() => setSelected(null)} />
    }

    return (
        <section className="rounded-md bg-(--color-card)">
            <div className="border-b border-(--color-border) px-5 py-4">
                <p className="text-sm font-semibold text-(--color-text)">Issues</p>
                <p className="mt-1 text-xs text-(--color-text-muted)">Ranked by affected users — the impact ordering, with the {windowDays}d trend.</p>
            </div>
            {hasFilters && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-(--color-border) px-5 py-3">
                    <DimensionFilter label="Type" items={facets!.errorType} active={errorType} onChange={setErrorType} />
                    <DimensionFilter label="Platform" items={facets!.platform} active={platform} onChange={setPlatform} />
                    {filterActive && (
                        <button
                            type="button"
                            onClick={() => { setErrorType(null); setPlatform(null) }}
                            className="text-xs text-(--color-text-muted) underline-offset-2 transition-colors hover:text-(--color-text) hover:underline"
                        >
                            Clear
                        </button>
                    )}
                </div>
            )}
            {loading && <p className="px-5 py-4 text-sm text-(--color-text-muted)">Loading issues…</p>}
            {error && <p className="px-5 py-4 text-sm text-(--color-error)">{error}</p>}
            {!loading && !error && (
                <div className="divide-y divide-(--color-border)">
                    {issues.length ? issues.map(issue => <IssueRow key={issue.id} issue={issue} onSelect={() => setSelected(issue.id)} />) : (
                        <p className="px-5 py-4 text-sm text-(--color-text-muted)">
                            {filterActive ? 'No issues match this filter.' : `No issues in the last ${windowDays} days. That's good news.`}
                        </p>
                    )}
                </div>
            )}
        </section>
    )
}
