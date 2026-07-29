'use client'

import Link from 'next/link'
import { formatDate } from '@/lib/format'
import type { ApiData } from '@/lib/fetchJson'
import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { Issue, IssueStatus } from '@/lib/types/issue'
import { useWorkspace } from '@/app/(core)/dashboard/contexts/WorkspaceContext'
import { routes } from '@/app/util/routes'

type ApiList<T> = { data: T[] }

const STATUS_LABELS: Record<IssueStatus, string> = {
    open: 'Open',
    done: 'Done',
    archived: 'Archived',
}

const TYPE_LABELS: Record<Issue['issueType'], string> = {
    issue: 'Issue',
    kill_criteria: 'Kill criteria',
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, init)
    const text = await res.text()
    const body = text ? JSON.parse(text) : {}
    if (!res.ok) {
        const detail = body?.detail
        const message = typeof detail === 'string' ? detail : body?.error || 'Request failed'
        throw new Error(message)
    }
    return body as T
}


function buildIssuesUrl(status: IssueStatus, pipelineId: string | null, issueType: string | null) {
    const params = new URLSearchParams({ status })
    if (pipelineId) params.set('pipelineId', pipelineId)
    if (issueType) params.set('issueType', issueType)
    return `/api/issues?${params.toString()}`
}

function IssuesPageInner() {
    const searchParams = useSearchParams()
    const queryPipelineId = searchParams.get('pipelineId')
    const issueType = searchParams.get('issueType')
    const { selectedPipelineId, hydrated } = useWorkspace()
    const [localPipelineId, setLocalPipelineId] = useState<string | null>(queryPipelineId)
    const [issues, setIssues] = useState<Issue[]>([])
    const [status, setStatus] = useState<IssueStatus>('open')
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [creating, setCreating] = useState(false)
    const [showCreate, setShowCreate] = useState(false)
    const [newTitle, setNewTitle] = useState('')
    const [newSummary, setNewSummary] = useState('')
    const pipelineId = queryPipelineId ?? localPipelineId
    const project = issues.find(issue => issue.project)?.project ?? null
    const team = issues.find(issue => issue.team)?.team ?? null
    const projectLabel = project?.name ?? (pipelineId ? 'Selected project' : 'No project selected')

    const filteredIssues = useMemo(() => {
        const needle = query.trim().toLowerCase()
        if (!needle) return issues
        return issues.filter(issue => (
            issue.title.toLowerCase().includes(needle)
            || (issue.summary ?? '').toLowerCase().includes(needle)
        ))
    }, [issues, query])

    useEffect(() => {
        if (hydrated && !queryPipelineId && !localPipelineId && selectedPipelineId) {
            setLocalPipelineId(selectedPipelineId)
        }
    }, [hydrated, localPipelineId, queryPipelineId, selectedPipelineId])

    useEffect(() => {
        let active = true
        if (!pipelineId) {
            setIssues([])
            setLoading(false)
            return () => {
                active = false
            }
        }
        setLoading(true)
        void (async () => {
            try {
                const json = await requestJson<ApiList<Issue>>(buildIssuesUrl(status, pipelineId, issueType))
                if (!active) return
                setIssues(json.data)
                setError(null)
            } catch (err) {
                if (active) setError(err instanceof Error ? err.message : 'Could not load issues')
            } finally {
                if (active) setLoading(false)
            }
        })()
        return () => {
            active = false
        }
    }, [pipelineId, issueType, status])

    async function createIssue(e: FormEvent) {
        e.preventDefault()
        if (!newTitle.trim() || !pipelineId) return
        setCreating(true)
        setError(null)
        try {
            const json = await requestJson<ApiData<Issue>>('/api/issues', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newTitle,
                    summary: newSummary || null,
                    pipeline_id: pipelineId,
                    issue_type: issueType === 'kill_criteria' ? 'kill_criteria' : 'issue',
                }),
            })
            if (status === 'open') setIssues(prev => [json.data, ...prev])
            setNewTitle('')
            setNewSummary('')
            setShowCreate(false)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not create issue')
        } finally {
            setCreating(false)
        }
    }

    return (
        <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto px-6 py-6">
            <div className={`flex shrink-0 items-center gap-3 ${issueType === 'kill_criteria' ? 'justify-between' : 'justify-end'}`}>
                {issueType === 'kill_criteria' && (
                    <p className="text-xs text-(--color-text-muted)">Viewing kill criteria in the same issue workflow.</p>
                )}
                <button
                    type="button"
                    onClick={() => setShowCreate(prev => !prev)}
                    disabled={!pipelineId}
                    className="rounded-md bg-(--color-button) px-4 py-2 text-sm font-medium text-(--color-on-button) transition-colors hover:bg-(--color-button-hover) disabled:opacity-40"
                >
                    New issue
                </button>
            </div>

            {error && (
                <div className="rounded-md border border-(--color-error) px-4 py-3 text-sm text-(--color-error)">
                    {error}
                </div>
            )}

            {showCreate && pipelineId && (
                <form onSubmit={createIssue} className="flex flex-col gap-3 rounded-md bg-(--color-card) p-4">
                    <div>
                        <p className="text-sm font-semibold text-(--color-text)">
                            New {issueType === 'kill_criteria' ? 'kill criteria' : 'issue'} for {projectLabel}
                        </p>
                        <p className="mt-1 text-xs text-(--color-text-muted)">
                            This issue will be attached to the selected project{team ? ` and ${team.name}` : ''}.
                        </p>
                    </div>
                    <input
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        aria-label="Issue title"
                        placeholder="Issue title"
                        className="rounded-md border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm text-(--color-text) outline-none focus:ring-2 focus:ring-(--color-text)"
                    />
                    <textarea
                        value={newSummary}
                        onChange={e => setNewSummary(e.target.value)}
                        aria-label="Issue summary"
                        placeholder="Summary"
                        rows={3}
                        className="resize-none rounded-md border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm text-(--color-text) outline-none focus:ring-2 focus:ring-(--color-text)"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xs text-(--color-text-muted)">Project: {projectLabel}</span>
                        <button
                            type="submit"
                            disabled={creating || !newTitle.trim()}
                            className="rounded-md bg-(--color-button) px-4 py-2 text-sm font-medium text-(--color-on-button) transition-colors hover:bg-(--color-button-hover) disabled:opacity-40"
                        >
                            {creating ? 'Creating...' : 'Create issue'}
                        </button>
                    </div>
                </form>
            )}

            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-(--color-border) bg-(--color-card) p-3">
                    <div className="flex rounded-md border border-(--color-border) p-1">
                        {(Object.keys(STATUS_LABELS) as IssueStatus[]).map(item => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => setStatus(item)}
                                className={`rounded-md px-3 py-2 text-sm transition-colors ${status === item ? 'bg-(--color-text) text-(--color-bg)' : 'text-(--color-text-muted) hover:text-(--color-text)'}`}
                            >
                                {STATUS_LABELS[item]}
                            </button>
                        ))}
                    </div>
                    <input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        aria-label="Search issues"
                        placeholder="Search issues..."
                        className="min-w-64 rounded-md border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm text-(--color-text) outline-none focus:ring-2 focus:ring-(--color-text)"
                    />
                </div>

                <section className="min-w-0 rounded-md bg-(--color-card)">
                    <div className="flex items-center justify-between border-b border-(--color-border) px-5 py-4">
                        <div>
                            <p className="text-sm font-semibold text-(--color-text)">{STATUS_LABELS[status]} issues for {projectLabel}</p>
                            <p className="mt-1 text-xs text-(--color-text-muted)">{filteredIssues.length} shown in this project</p>
                        </div>
                    </div>

                    {!pipelineId ? (
                        <div className="p-10 text-center">
                            <p className="text-sm font-medium text-(--color-text)">Select a project from the top bar to view issues.</p>
                            <p className="mt-1 text-xs text-(--color-text-muted)">Issues, kill criteria, and follow-up work inherit the project context.</p>
                        </div>
                    ) : loading ? (
                        <div className="p-5 text-sm text-(--color-text-muted)">Loading issues...</div>
                    ) : filteredIssues.length === 0 ? (
                        <div className="p-10 text-center">
                            <p className="text-sm font-medium text-(--color-text)">No issues match this view.</p>
                            <p className="mt-1 text-xs text-(--color-text-muted)">Create an issue or adjust the status/search filters.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-(--color-border)">
                            {filteredIssues.map(issue => (
                                <Link
                                    key={issue.id}
                                    href={`/dashboard/manage/issues/${issue.id}`}
                                    className="block p-5 transition-colors hover:bg-(--color-bg)"
                                >
                                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${issue.status === 'open' ? 'bg-(--status-progress-bg) text-(--status-progress-text)' : 'bg-(--status-done-bg) text-(--status-done-text)'}`}>
                                                    {STATUS_LABELS[issue.status]}
                                                </span>
                                                <span className="rounded-md bg-(--color-bg) px-2 py-0.5 text-xs text-(--color-text-muted)">
                                                    {TYPE_LABELS[issue.issueType]}
                                                </span>
                                                <p className="min-w-0 truncate text-base font-semibold text-(--color-text)">{issue.title}</p>
                                            </div>
                                            {issue.summary && (
                                                <p className="mt-2 line-clamp-2 text-sm leading-6 text-(--color-text-muted)">{issue.summary}</p>
                                            )}
                                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-(--color-text-muted)">
                                                <span>Project: {issue.project?.name ?? projectLabel}</span>
                                                <span>Team: {issue.team?.name ?? 'Unassigned'}</span>
                                                <span>Updated {formatDate(issue.updatedAt, 'No date')}</span>
                                            </div>
                                        </div>
                                        <div className="text-xs text-(--color-text-muted) md:text-right">
                                            <p>{issue.commentCount} comments</p>
                                            <p className="mt-1">{issue.subIssueCount} subissues</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}

export default function IssuesPage() {
    return (
        <Suspense fallback={<div className="px-6 py-6 text-sm text-(--color-text-muted)">Loading issues...</div>}>
            <IssuesPageInner />
        </Suspense>
    )
}
