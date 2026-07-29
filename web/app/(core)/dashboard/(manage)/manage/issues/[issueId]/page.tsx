'use client'

import Link from 'next/link'
import { formatDate } from '@/lib/format'
import type { ApiData } from '@/lib/fetchJson'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import type { Issue, IssueDetail, IssueStatus } from '@/lib/types/issue'
import type { Team } from '@/lib/types/team'
import { routes } from '@/app/util/routes'


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


export default function IssueDetailPage({ params }: { params: Promise<{ issueId: string }> }) {
    const [issueId, setIssueId] = useState<string | null>(null)
    const [issue, setIssue] = useState<IssueDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [title, setTitle] = useState('')
    const [summary, setSummary] = useState('')
    const [status, setStatus] = useState<IssueStatus>('open')
    const [team, setTeam] = useState<Team | null>(null)
    const [teamLoading, setTeamLoading] = useState(false)
    const [assigneeSaving, setAssigneeSaving] = useState(false)
    const [commentBody, setCommentBody] = useState('')
    const [subIssueTitle, setSubIssueTitle] = useState('')

    const statusOptions = useMemo(() => Object.keys(STATUS_LABELS) as IssueStatus[], [])
    const assigneeOptions = useMemo(
        () => (team?.members ?? []).filter(member => member.status !== 'removed'),
        [team?.members],
    )

    useEffect(() => {
        void (async () => {
            const resolved = await params
            setIssueId(resolved.issueId)
        })()
    }, [params])

    useEffect(() => {
        if (!issueId) return
        let active = true
        void (async () => {
            try {
                const json = await requestJson<ApiData<IssueDetail>>(`/api/issues/${issueId}`)
                if (!active) return
                setIssue(json.data)
                setTitle(json.data.title)
                setSummary(json.data.summary ?? '')
                setStatus(json.data.status)
                setError(null)
                if (json.data.teamId) {
                    setTeamLoading(true)
                    try {
                        const teamJson = await requestJson<ApiData<Team>>(`/api/teams/${json.data.teamId}`)
                        if (active) setTeam(teamJson.data)
                    } catch {
                        if (active) setTeam(null)
                    } finally {
                        if (active) setTeamLoading(false)
                    }
                } else {
                    setTeam(null)
                }
            } catch (err) {
                if (active) setError(err instanceof Error ? err.message : 'Could not load issue')
            } finally {
                if (active) setLoading(false)
            }
        })()
        return () => {
            active = false
        }
    }, [issueId])

    async function saveIssue(e: FormEvent) {
        e.preventDefault()
        if (!issueId || !title.trim()) return
        setSaving(true)
        setError(null)
        try {
            const json = await requestJson<ApiData<IssueDetail>>(`/api/issues/${issueId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, summary: summary || null, status }),
            })
            setIssue(prev => prev ? { ...prev, ...json.data, comments: prev.comments, subIssues: prev.subIssues } : json.data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save issue')
        } finally {
            setSaving(false)
        }
    }

    async function updateAssignee(assigneeId: string) {
        if (!issueId || !issue?.teamId) return
        setAssigneeSaving(true)
        setError(null)
        try {
            const json = await requestJson<ApiData<IssueDetail>>(`/api/issues/${issueId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignee_id: assigneeId || null }),
            })
            setIssue(prev => prev ? { ...prev, ...json.data, comments: prev.comments, subIssues: prev.subIssues } : json.data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save assignee')
        } finally {
            setAssigneeSaving(false)
        }
    }

    async function addComment(e: FormEvent) {
        e.preventDefault()
        if (!issueId || !commentBody.trim()) return
        setError(null)
        try {
            const json = await requestJson<ApiData<IssueDetail['comments'][number]>>(`/api/issues/${issueId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ body: commentBody }),
            })
            setIssue(prev => prev ? { ...prev, comments: [...prev.comments, json.data], commentCount: prev.commentCount + 1 } : prev)
            setCommentBody('')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not add comment')
        }
    }

    async function createSubIssue(e: FormEvent) {
        e.preventDefault()
        if (!issueId || !subIssueTitle.trim()) return
        setError(null)
        try {
            const json = await requestJson<ApiData<Issue>>(`/api/issues/${issueId}/subissues`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: subIssueTitle }),
            })
            setIssue(prev => prev ? { ...prev, subIssues: [...prev.subIssues, json.data], subIssueCount: prev.subIssueCount + 1 } : prev)
            setSubIssueTitle('')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not create subissue')
        }
    }

    if (loading) {
        return <div className="px-6 py-6 text-sm text-(--color-text-muted)">Loading issue...</div>
    }

    if (!issue) {
        return (
            <div className="px-6 py-6">
                <Link href={routes.core.issues} className="text-sm font-medium text-(--color-text) hover:underline">Back to issues</Link>
                <p className="mt-6 text-sm text-(--color-text-muted)">Issue not found.</p>
            </div>
        )
    }
    const projectName = issue.project?.name ?? 'Project'
    const teamName = issue.team?.name ?? 'Unassigned team'
    const isSubissue = Boolean(issue.parentIssueId)

    return (
        <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col gap-6 overflow-y-auto px-6 py-6">
            <div className="flex flex-col gap-5">
                <div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-(--color-text-muted)">
                        {issue.pipelineId ? (
                            <Link href={`${routes.core.issues}?pipelineId=${issue.pipelineId}`} className="font-medium text-(--color-text) hover:underline">
                                {projectName}
                            </Link>
                        ) : (
                            <span>{projectName}</span>
                        )}
                        <span>-</span>
                        {isSubissue && issue.parentIssue ? (
                            <>
                                <Link href={`${routes.core.issues}/${issue.parentIssue.id}`} className="font-medium text-(--color-text) hover:underline">
                                    {issue.parentIssue.title}
                                </Link>
                                <span>-</span>
                                <span>Subissue</span>
                            </>
                        ) : (
                            <span>Issue</span>
                        )}
                    </div>
                    <form onSubmit={saveIssue} className="mt-4 flex flex-col gap-3">
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            aria-label="Issue title"
                            className="w-full border-b border-(--color-border) bg-transparent px-0 py-2 text-3xl font-semibold text-(--color-text) outline-none focus:border-(--color-text)"
                        />
                        <textarea
                            value={summary}
                            onChange={e => setSummary(e.target.value)}
                            aria-label="Issue summary"
                            placeholder="Summary"
                            rows={3}
                            className="resize-none border-b border-(--color-border) bg-transparent px-0 py-2 text-sm leading-6 text-(--color-text) outline-none focus:border-(--color-text)"
                        />
                        <div className="flex flex-wrap items-center gap-3">
                            <select
                                value={status}
                                onChange={e => setStatus(e.target.value as IssueStatus)}
                                aria-label="Issue status"
                                className="rounded-md border border-(--color-border) bg-(--color-card) px-3 py-2 text-sm text-(--color-text) outline-none focus:ring-2 focus:ring-(--color-text)"
                            >
                                {statusOptions.map(item => (
                                    <option key={item} value={item}>{STATUS_LABELS[item]}</option>
                                ))}
                            </select>
                            <span className="rounded-md bg-(--color-bg) px-2 py-1 text-xs text-(--color-text-muted)">
                                {TYPE_LABELS[issue.issueType]}
                            </span>
                            <button
                                type="submit"
                                disabled={saving || !title.trim()}
                                className="rounded-md bg-(--color-button) px-4 py-2 text-sm font-medium text-(--color-on-button) transition-colors hover:bg-(--color-button-hover) disabled:opacity-40"
                            >
                                {saving ? 'Saving...' : 'Save issue'}
                            </button>
                        </div>
                    </form>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <Link href={issue.pipelineId ? `${routes.core.pipeline}?cardId=${issue.pipelineId}` : routes.core.pipeline} className="rounded-md bg-(--color-card) p-4 hover:bg-(--color-bg)">
                        <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">Project</p>
                        <p className="mt-2 text-sm font-semibold text-(--color-text)">{projectName}</p>
                    </Link>
                    <Link href={routes.core.teams} className="rounded-md bg-(--color-card) p-4 hover:bg-(--color-bg)">
                        <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">Team</p>
                        <p className="mt-2 text-sm font-semibold text-(--color-text)">{teamName}</p>
                    </Link>
                </div>
            </div>

            {error && (
                <div className="rounded-md border border-(--color-error) px-4 py-3 text-sm text-(--color-error)">
                    {error}
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <main className="flex min-w-0 flex-col gap-6">
                    <section className="rounded-md bg-(--color-card)">
                        <div className="border-b border-(--color-border) px-5 py-4">
                            <p className="text-sm font-semibold text-(--color-text)">Activity thread</p>
                        </div>
                        <div className="divide-y divide-(--color-border)">
                            {issue.comments.length === 0 ? (
                                <p className="p-5 text-sm text-(--color-text-muted)">No comments yet.</p>
                            ) : issue.comments.map(comment => (
                                <article key={comment.id} className="p-5">
                                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-(--color-text-muted)">
                                        <span className="font-semibold text-(--color-text)">{comment.authorDisplayName}</span>
                                        <span>{formatDate(comment.createdAt, 'No date')}</span>
                                    </div>
                                    <p className="text-sm leading-6 text-(--color-text)">{comment.body}</p>
                                </article>
                            ))}
                        </div>
                        <form onSubmit={addComment} className="flex flex-col gap-3 border-t border-(--color-border) p-5">
                            <textarea
                                value={commentBody}
                                onChange={e => setCommentBody(e.target.value)}
                                aria-label="Comment body"
                                placeholder="Add a comment..."
                                rows={4}
                                className="resize-none rounded-md border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm text-(--color-text) outline-none focus:ring-2 focus:ring-(--color-text)"
                            />
                            <button
                                type="submit"
                                disabled={!commentBody.trim()}
                                className="self-end rounded-md bg-(--color-button) px-4 py-2 text-sm font-medium text-(--color-on-button) transition-colors hover:bg-(--color-button-hover) disabled:opacity-40"
                            >
                                Add comment
                            </button>
                        </form>
                    </section>
                </main>

                <aside className="flex flex-col gap-6">
                    <section className="rounded-md bg-(--color-card) p-5">
                        <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">Metadata</p>
                        <dl className="mt-4 grid gap-3 text-sm">
                            <div className="flex justify-between gap-3">
                                <dt className="text-(--color-text-muted)">Project</dt>
                                <dd className="text-right font-medium text-(--color-text)">{projectName}</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                                <dt className="text-(--color-text-muted)">Team</dt>
                                <dd className="text-right font-medium text-(--color-text)">{teamName}</dd>
                            </div>
                            <div className="grid gap-2">
                                <dt className="text-(--color-text-muted)">Assignee</dt>
                                <dd>
                                    <select
                                        value={issue.assigneeId ?? ''}
                                        aria-label="Issue assignee"
                                        onChange={e => void updateAssignee(e.target.value)}
                                        disabled={!issue.teamId || teamLoading || assigneeSaving}
                                        className="w-full rounded-md border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm text-(--color-text) disabled:opacity-60"
                                    >
                                        <option value="">
                                            {issue.teamId ? 'Unassigned' : 'No team assigned'}
                                        </option>
                                        {assigneeOptions.map(member => (
                                            <option key={member.id} value={member.id}>
                                                {member.displayName || member.email || member.role}
                                            </option>
                                        ))}
                                    </select>
                                </dd>
                            </div>
                            <div className="flex justify-between gap-3">
                                <dt className="text-(--color-text-muted)">Status</dt>
                                <dd className="font-medium text-(--color-text)">{STATUS_LABELS[issue.status]}</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                                <dt className="text-(--color-text-muted)">Type</dt>
                                <dd className="font-medium text-(--color-text)">{issue.issueType === 'kill_criteria' ? 'Kill criteria' : 'Issue'}</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                                <dt className="text-(--color-text-muted)">Created</dt>
                                <dd className="text-(--color-text)">{formatDate(issue.createdAt, 'No date')}</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                                <dt className="text-(--color-text-muted)">Updated</dt>
                                <dd className="text-(--color-text)">{formatDate(issue.updatedAt, 'No date')}</dd>
                            </div>
                        </dl>
                    </section>

                    <section className="rounded-md bg-(--color-card)">
                        <div className="border-b border-(--color-border) px-5 py-4">
                            <p className="text-sm font-semibold text-(--color-text)">Subissues for {issue.title}</p>
                            <p className="mt-1 text-xs text-(--color-text-muted)">These stay nested under the current issue.</p>
                        </div>
                        <div className="divide-y divide-(--color-border)">
                            {issue.subIssues.length === 0 ? (
                                <p className="p-5 text-sm text-(--color-text-muted)">No subissues yet.</p>
                            ) : issue.subIssues.map(item => (
                                <Link
                                    key={item.id}
                                    href={`/dashboard/manage/issues/${item.id}`}
                                    className="block border-l-2 border-(--color-border) p-5 pl-6 text-sm font-medium text-(--color-text) hover:bg-(--color-bg)"
                                >
                                    {item.title}
                                </Link>
                            ))}
                        </div>
                        <form onSubmit={createSubIssue} className="flex flex-col gap-2 border-t border-(--color-border) p-5">
                            <label className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)" htmlFor="subissue-title">
                                Add subissue to {issue.title}
                            </label>
                            <div className="flex gap-2">
                            <input
                                id="subissue-title"
                                value={subIssueTitle}
                                onChange={e => setSubIssueTitle(e.target.value)}
                                aria-label="Subissue title"
                                placeholder="Subissue title"
                                className="min-w-0 flex-1 rounded-md border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm text-(--color-text) outline-none focus:ring-2 focus:ring-(--color-text)"
                            />
                            <button
                                type="submit"
                                disabled={!subIssueTitle.trim()}
                                className="rounded-md bg-(--color-button) px-3 py-2 text-sm font-medium text-(--color-on-button) transition-colors hover:bg-(--color-button-hover) disabled:opacity-40"
                            >
                                Add
                            </button>
                            </div>
                        </form>
                    </section>
                </aside>
            </div>
        </div>
    )
}
