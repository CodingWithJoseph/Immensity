'use client'

import {
    AlertTriangle,
    ArrowUp,
    Bookmark,
    Check,
    ChevronDown,
    Database,
    History,
    LoaderCircle,
    Plus,
    SlidersHorizontal,
    Sparkles,
    X,
} from 'lucide-react'
import Image from 'next/image'
import { FormEvent, KeyboardEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { auth } from '@/lib/firebase'
import type {
    ClusterSearchDraft,
    SearchAgentResponse,
    SearchAgentStep,
    SearchAgentStopReason,
    SearchFilterOptions,
    SearchInterpretation,
    SearchQueryResponse,
    SearchResultCluster,
    SearchSessionDetail,
    SearchSessionSummary,
    SearchSessionView,
} from '@/lib/types/search'
import { SEARCH_SORTS, searchDraftChips } from '@/lib/types/search'
import ClusterDetailPanel from '@/app/(core)/dashboard/(discovery)/discover/search/ClusterDetailPanel'
import ProjectSetupModal from '@/app/(core)/dashboard/components/ProjectSetupModal'
import type { ClusterCardProps } from '@/components/clusters/ClusterCard'
import SearchHistoryPanel from '@/app/(core)/dashboard/(discovery)/discover/search/SearchHistoryPanel'

type CardCluster = ClusterCardProps['cluster']

interface SearchTurn {
    id: number
    userMessage: string
    response: SearchAgentResponse | SearchInterpretation | null
    error?: string
}

const AGENT_ACTION_LABELS: Record<SearchAgentStep['action'], string> = {
    inspect_filter_options: 'Checked database filters',
    prepare_search_draft: 'Prepared search draft',
    unsupported_tool: 'Rejected an unsupported action',
}

const AGENT_STOP_LABELS: Record<SearchAgentStopReason, string> = {
    confirmation_required: 'Ready for confirmation',
    clarification_required: 'Waiting for clarification',
    fallback: 'Used safe keyword fallback',
    step_limit: 'Stopped at the action limit',
}

function isAgentResponse(response: SearchInterpretation): response is SearchAgentResponse {
    return 'steps' in response && 'stop_reason' in response
}

function persistedInterpretation(response: SearchAgentResponse): SearchInterpretation {
    return {
        draft: response.draft,
        confirmation: response.confirmation,
        assumptions: response.assumptions,
        unsupported: response.unsupported,
        clarification_question: response.clarification_question,
        needs_clarification: response.needs_clarification,
        needs_confirmation: response.needs_confirmation,
        fallback_used: response.fallback_used,
        available_options: response.available_options,
    }
}

function AgentActivity({ response }: { response: SearchAgentResponse }) {
    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-(--color-text-muted)" aria-label="Agent activity">
            {response.steps.map(step => (
                <span key={step.sequence} className="inline-flex items-center gap-1">
                    {step.outcome === 'completed' ? (
                        <Check size={13} className="text-(--color-success-text)" aria-hidden />
                    ) : (
                        <X size={13} className="text-(--color-warning-text)" aria-hidden />
                    )}
                    {AGENT_ACTION_LABELS[step.action]}
                </span>
            ))}
            <span className="font-medium text-(--color-text)">{AGENT_STOP_LABELS[response.stop_reason]}</span>
        </div>
    )
}

function mapDiscovery(cluster: SearchResultCluster): CardCluster {
    return {
        id: String(cluster.id),
        name: cluster.name ?? '',
        summary: cluster.summary ?? '',
        opportunity_type: cluster.opportunity_type ?? '',
        opportunity_domain: cluster.opportunity_domain ?? '',
        post_count: cluster.post_count,
        trending: cluster.trending_status != null,
        last_seen_date: cluster.date_range_end,
        sources: cluster.sources ?? [],
        sample_posts: (cluster.sample_posts ?? []).map(post => ({
            id: String(post.id),
            title: post.title ?? '',
        })),
        is_watched: cluster.is_watched,
    }
}

async function responseError(response: Response, fallback: string): Promise<string> {
    try {
        const body = (await response.json()) as { error?: string; detail?: string }
        return body.error || body.detail || fallback
    } catch {
        return fallback
    }
}

function FilterPills({ draft }: { draft: ClusterSearchDraft }) {
    return (
        <div className="flex flex-wrap gap-2" aria-label="Proposed search filters">
            {searchDraftChips(draft).map(chip => (
                <span
                    key={chip.key}
                    className="rounded-full border border-(--color-border) bg-(--color-surface-tint) px-3 py-1.5 text-xs font-medium text-(--color-text)"
                >
                    {chip.label}
                </span>
            ))}
        </div>
    )
}

function OptionPicker({
    label,
    options,
    selected,
    onChange,
}: {
    label: string
    options: string[]
    selected: string[]
    onChange: (values: string[]) => void
}) {
    const remaining = options.filter(option => !selected.includes(option))

    return (
        <label className="flex flex-col gap-2 text-xs font-medium text-(--color-text-muted)">
            {label}
            <div className="flex flex-wrap gap-2">
                {selected.map(value => (
                    <span
                        key={value}
                        className="inline-flex items-center gap-1 rounded-full bg-(--color-blue-soft) px-2.5 py-1 text-xs text-(--color-info-text)"
                    >
                        {value}
                        <button
                            type="button"
                            onClick={() => onChange(selected.filter(item => item !== value))}
                            aria-label={`Remove ${value}`}
                            className="rounded-full p-0.5 hover:bg-(--color-surface)"
                        >
                            <X size={12} aria-hidden />
                        </button>
                    </span>
                ))}
                {remaining.length > 0 && (
                    <span className="relative inline-flex items-center">
                        <select
                            value=""
                            onChange={event => {
                                if (event.target.value) onChange([...selected, event.target.value])
                            }}
                            className="appearance-none rounded-full border border-(--color-border) bg-(--color-surface) py-1 pl-2.5 pr-7 text-xs text-(--color-text)"
                            aria-label={`Add ${label.toLowerCase()} filter`}
                        >
                            <option value="">Add</option>
                            {remaining.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="pointer-events-none absolute right-2" aria-hidden />
                    </span>
                )}
            </div>
        </label>
    )
}

function SearchFilterEditor({
    draft,
    options,
    onApply,
    onCancel,
}: {
    draft: ClusterSearchDraft
    options: SearchFilterOptions
    onApply: (draft: ClusterSearchDraft) => void
    onCancel: () => void
}) {
    const [edited, setEdited] = useState<ClusterSearchDraft>(draft)
    const queryInvalid = edited.query?.length === 1

    return (
        <div className="mt-4 rounded-xl border border-(--color-border) bg-(--color-bg) p-4">
            <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-xs font-medium text-(--color-text-muted) sm:col-span-2">
                    Keywords
                    <input
                        value={edited.query ?? ''}
                        onChange={event => setEdited(current => ({
                            ...current,
                            query: event.target.value.trimStart() || null,
                        }))}
                        className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-text)"
                    />
                    {queryInvalid && <span className="text-(--color-error-text)">Use at least two characters.</span>}
                </label>

                <OptionPicker
                    label="Domains"
                    options={options.opportunity_domains}
                    selected={edited.opportunity_domains}
                    onChange={values => setEdited(current => ({ ...current, opportunity_domains: values }))}
                />
                <OptionPicker
                    label="Problem types"
                    options={options.opportunity_types}
                    selected={edited.opportunity_types}
                    onChange={values => setEdited(current => ({ ...current, opportunity_types: values }))}
                />
                <OptionPicker
                    label="Sources"
                    options={options.sources}
                    selected={edited.sources}
                    onChange={values => setEdited(current => ({ ...current, sources: values }))}
                />
                <OptionPicker
                    label="Communities"
                    options={options.communities}
                    selected={edited.communities}
                    onChange={values => setEdited(current => ({ ...current, communities: values }))}
                />

                <label className="flex flex-col gap-2 text-xs font-medium text-(--color-text-muted)">
                    Minimum posts
                    <input
                        type="number"
                        min={1}
                        max={100000}
                        value={edited.min_posts}
                        onChange={event => setEdited(current => ({
                            ...current,
                            min_posts: Math.max(1, Number(event.target.value) || 1),
                        }))}
                        className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-text)"
                    />
                </label>
                <label className="flex flex-col gap-2 text-xs font-medium text-(--color-text-muted)">
                    Observed since
                    <input
                        type="date"
                        value={edited.observed_after?.slice(0, 10) ?? ''}
                        onChange={event => setEdited(current => ({
                            ...current,
                            observed_after: event.target.value ? `${event.target.value}T00:00:00.000Z` : null,
                        }))}
                        className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-text)"
                    />
                </label>
                <label className="flex flex-col gap-2 text-xs font-medium text-(--color-text-muted)">
                    Minimum signal (0–1)
                    <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.05}
                        value={edited.min_signal_score ?? ''}
                        onChange={event => setEdited(current => ({
                            ...current,
                            min_signal_score: event.target.value === ''
                                ? null
                                : Math.min(1, Math.max(0, Number(event.target.value))),
                        }))}
                        className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-text)"
                    />
                </label>
                <label className="flex flex-col gap-2 text-xs font-medium text-(--color-text-muted)">
                    Sort results
                    <select
                        value={edited.sort}
                        onChange={event => setEdited(current => ({
                            ...current,
                            sort: event.target.value as ClusterSearchDraft['sort'],
                        }))}
                        className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-text)"
                    >
                        {SEARCH_SORTS.map(sort => (
                            <option key={sort} value={sort}>{sort.replace('_', ' ')}</option>
                        ))}
                    </select>
                </label>
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm text-(--color-text)">
                <input
                    type="checkbox"
                    checked={edited.trending_only}
                    onChange={event => setEdited(current => ({ ...current, trending_only: event.target.checked }))}
                />
                Trending clusters only
            </label>

            <div className="mt-4 flex justify-end gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-(--color-text-muted) hover:text-(--color-text)"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    disabled={queryInvalid}
                    onClick={() => onApply({
                        ...edited,
                        query: edited.query?.trim() || null,
                        offset: 0,
                    })}
                    className="rounded-lg bg-(--color-button) px-3 py-2 text-sm font-medium text-(--color-on-button) hover:bg-(--color-button-hover) disabled:opacity-40"
                >
                    Apply filters
                </button>
            </div>
        </div>
    )
}

function formatObservedDate(value: string | null | undefined): string | null {
    if (!value) return null

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(date)
}

function SearchResultRow({
    cluster,
    watchPending,
    onOpen,
    onWatch,
    onOpenSignal,
}: {
    cluster: SearchResultCluster
    watchPending: boolean
    onOpen: () => void
    onWatch: () => void
    onOpenSignal: () => void
}) {
    const clusterName = cluster.name || 'Unnamed problem cluster'
    const metadata = [
        cluster.opportunity_type,
        cluster.opportunity_domain,
        ...(cluster.sources ?? []),
        ...(cluster.subreddits ?? []).slice(0, 2),
    ].filter(Boolean) as string[]
    const observedDate = formatObservedDate(cluster.date_range_end)
    const sampleEvidence = (cluster.sample_posts ?? [])
        .filter(post => post.title?.trim())
        .slice(0, 2)

    return (
        <article className="border-b border-(--color-border) px-1 py-5 last:border-b-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold">
                            <button
                                type="button"
                                onClick={onOpen}
                                className="rounded-sm text-left text-(--color-text) hover:text-(--color-link-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus)"
                            >
                                {clusterName}
                            </button>
                        </h3>
                        {cluster.trending_status && (
                            <span className="rounded-full bg-(--color-accent-soft) px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-(--color-accent-hover)">
                                Trending
                            </span>
                        )}
                    </div>
                    {metadata.length > 0 && (
                        <ul aria-label="Result metadata" className="mt-2 flex flex-wrap gap-1.5">
                            {metadata.map((value, index) => (
                                <li
                                    key={`${value}-${index}`}
                                    className="rounded-full bg-(--color-surface-tint) px-2 py-1 text-[11px] text-(--color-text-muted)"
                                >
                                    {value}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-(--color-text-muted)">
                    {cluster.signalScore != null && (
                        <span title="Signal score" className="font-semibold text-(--color-info-text)">
                            {Math.round(cluster.signalScore * 100)}% signal
                        </span>
                    )}
                    <span>{cluster.post_count} post{cluster.post_count === 1 ? '' : 's'}</span>
                    {observedDate && <span>Last observed {observedDate}</span>}
                </div>
            </div>

            {(cluster.problemStatement || cluster.summary) && (
                <p className="mt-3 max-w-4xl text-sm leading-6 text-(--color-text)">
                    {cluster.problemStatement || cluster.summary}
                </p>
            )}

            {sampleEvidence.length > 0 && (
                <div className="mt-4 rounded-xl bg-(--color-surface-tint) p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-(--color-text-muted)">
                        Sample evidence
                    </p>
                    <ul className="mt-2 space-y-1.5 text-xs leading-5 text-(--color-text)">
                        {sampleEvidence.map(post => (
                            <li key={post.id} className="flex gap-2">
                                <span aria-hidden className="text-(--color-accent)">•</span>
                                <span>{post.title}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                    type="button"
                    onClick={onOpen}
                    aria-label={`View evidence for ${clusterName}`}
                    className="self-start rounded-sm text-xs font-medium text-(--color-link) hover:text-(--color-link-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus)"
                >
                    View evidence
                </button>
                {cluster.is_watched ? (
                    <button
                        type="button"
                        onClick={onOpenSignal}
                        className="w-full rounded-lg border border-(--color-border) px-3 py-1.5 text-xs font-semibold text-(--color-text) hover:bg-(--color-surface-tint) sm:w-auto"
                    >
                        Open Signal
                    </button>
                ) : (
                    <button
                        type="button"
                        disabled={watchPending}
                        onClick={onWatch}
                        className="w-full rounded-lg border border-(--color-border) px-3 py-1.5 text-xs font-semibold text-(--color-text) hover:bg-(--color-surface-tint) disabled:opacity-50 sm:w-auto"
                    >
                        {watchPending ? 'Adding…' : 'Add to Pipeline'}
                    </button>
                )}
            </div>
        </article>
    )
}

export function ClusterSearchInner() {
    const router = useRouter()
    const [input, setInput] = useState('')
    const [turns, setTurns] = useState<SearchTurn[]>([])
    const [pendingTurnId, setPendingTurnId] = useState<number | null>(null)
    const [editingTurnId, setEditingTurnId] = useState<number | null>(null)
    const [results, setResults] = useState<SearchQueryResponse | null>(null)
    const [executedDraft, setExecutedDraft] = useState<ClusterSearchDraft | null>(null)
    const [queryLoading, setQueryLoading] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [watchPending, setWatchPending] = useState<Set<string>>(new Set())
    const [selectedCluster, setSelectedCluster] = useState<CardCluster | null>(null)
    const [setupProject, setSetupProject] = useState<{ pipelineId: string; name: string } | null>(null)
    const [currentSession, setCurrentSession] = useState<SearchSessionSummary | null>(null)
    const [historyOpen, setHistoryOpen] = useState(false)
    const [historyView, setHistoryView] = useState<SearchSessionView>('recent')
    const [historySessions, setHistorySessions] = useState<SearchSessionSummary[]>([])
    const [historyLoading, setHistoryLoading] = useState(false)
    const [historyError, setHistoryError] = useState<string | null>(null)
    const [pendingSessionId, setPendingSessionId] = useState<string | null>(null)
    const turnIdRef = useRef(0)
    const sessionIdRef = useRef<string | null>(null)
    const sessionCreationRef = useRef<Promise<string | null> | null>(null)
    const sessionGenerationRef = useRef(0)
    const historyRequestRef = useRef(0)
    const pendingHistoryActionRef = useRef<string | null>(null)
    const endRef = useRef<HTMLDivElement>(null)

    const beginHistoryAction = useCallback((sessionId: string): boolean => {
        if (pendingHistoryActionRef.current !== null) return false
        pendingHistoryActionRef.current = sessionId
        setPendingSessionId(sessionId)
        return true
    }, [])

    const finishHistoryAction = useCallback((sessionId: string) => {
        if (pendingHistoryActionRef.current === sessionId) {
            pendingHistoryActionRef.current = null
        }
        setPendingSessionId(current => current === sessionId ? null : current)
    }, [])

    const ensureSearchSession = useCallback(async (token: string): Promise<string | null> => {
        if (sessionIdRef.current) return sessionIdRef.current
        if (sessionCreationRef.current) return sessionCreationRef.current

        const generation = sessionGenerationRef.current
        const creation = (async () => {
            try {
                const response = await fetch('/api/clusters/search/sessions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({}),
                })
                if (!response.ok) return null

                const session = (await response.json()) as SearchSessionSummary
                if (sessionGenerationRef.current !== generation) return null
                sessionIdRef.current = session.id
                setCurrentSession(session)
                return session.id
            } catch {
                return null
            }
        })()
        sessionCreationRef.current = creation
        try {
            return await creation
        } finally {
            if (sessionCreationRef.current === creation) sessionCreationRef.current = null
        }
    }, [])

    const latestResponse = useMemo(() => {
        for (let index = turns.length - 1; index >= 0; index -= 1) {
            if (turns[index].response) return turns[index].response
        }
        return null
    }, [turns])

    useEffect(() => {
        endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
    }, [turns, results, pendingTurnId, queryLoading])

    const submitMessage = useCallback(async (override?: string) => {
        const message = (override ?? input).trim()
        if (message.length < 2 || pendingTurnId != null) return

        const id = ++turnIdRef.current
        const currentDraft = latestResponse?.draft ?? null
        setInput('')
        setResults(null)
        setExecutedDraft(null)
        setEditingTurnId(null)
        setTurns(current => [...current, { id, userMessage: message, response: null }])
        setPendingTurnId(id)

        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) throw new Error('Please sign in again to search.')

            const response = await fetch('/api/clusters/search/agent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    message,
                    ...(currentDraft ? { current_draft: currentDraft } : {}),
                }),
            })
            if (!response.ok) throw new Error(await responseError(response, 'Could not prepare that search.'))

            const agentResponse = (await response.json()) as SearchAgentResponse
            const interpretation = persistedInterpretation(agentResponse)
            setTurns(current => current.map(turn => (
                turn.id === id ? { ...turn, response: agentResponse } : turn
            )))
            const sessionId = await ensureSearchSession(token)
            if (!sessionId) {
                toast.error('Search is working, but this conversation could not be saved to history.')
            } else {
                try {
                    const saved = await fetch(`/api/clusters/search/sessions/${sessionId}/turns`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ user_message: message, interpretation }),
                    })
                    if (!saved.ok) {
                        throw new Error(await responseError(saved, 'Could not save this conversation turn.'))
                    }
                    setCurrentSession(current => current ? {
                        ...current,
                        title: current.title === 'New search'
                            ? message.replace(/\s+/g, ' ').slice(0, 80)
                            : current.title,
                        last_activity_at: new Date().toISOString(),
                    } : current)
                } catch {
                    toast.error('Search is working, but this conversation turn was not saved. Retry your message to save it.')
                }
            }
        } catch (error) {
            const messageText = error instanceof Error ? error.message : 'Could not prepare that search.'
            setTurns(current => current.map(turn => (
                turn.id === id ? { ...turn, error: messageText } : turn
            )))
        } finally {
            setPendingTurnId(null)
        }
    }, [ensureSearchSession, input, latestResponse, pendingTurnId])

    const updateTurnDraft = useCallback((turnId: number, draft: ClusterSearchDraft) => {
        setTurns(current => current.map(turn => (
            turn.id === turnId && turn.response
                ? { ...turn, response: { ...turn.response, draft } }
                : turn
        )))
        setResults(null)
        setExecutedDraft(null)
        setEditingTurnId(null)
    }, [])

    const runSearch = useCallback(async (
        draft: ClusterSearchDraft,
        append = false,
        persistRun = !append,
    ) => {
        if (append) setLoadingMore(true)
        else setQueryLoading(true)

        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) throw new Error('Please sign in again to search.')
            const sessionPromise = persistRun ? ensureSearchSession(token) : null

            const response = await fetch('/api/clusters/search/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(draft),
            })
            if (!response.ok) throw new Error(await responseError(response, 'Could not run that search.'))

            const page = (await response.json()) as SearchQueryResponse
            setResults(current => append && current
                ? { ...page, data: [...current.data, ...page.data] }
                : page)
            if (!append) {
                const persistedDraft = { ...draft, offset: 0 }
                setExecutedDraft(persistedDraft)
                if (sessionPromise) {
                    const sessionId = await sessionPromise
                    if (!sessionId) {
                        toast.error('Results loaded, but this search run could not be saved to history.')
                    } else {
                        try {
                            const saved = await fetch(`/api/clusters/search/sessions/${sessionId}/runs`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({
                                    draft: persistedDraft,
                                    result_cluster_ids: page.data.map(cluster => String(cluster.id)),
                                    result_count: page.total,
                                }),
                            })
                            if (!saved.ok) {
                                throw new Error(await responseError(saved, 'Could not save this search run.'))
                            }
                        } catch {
                            toast.error('Results loaded, but this search run was not saved to history. Confirm the search again to retry.')
                        }
                    }
                }
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Could not run that search.')
        } finally {
            if (append) setLoadingMore(false)
            else setQueryLoading(false)
        }
    }, [ensureSearchSession])

    const loadMore = useCallback(() => {
        if (!results?.pagination.has_more || results.pagination.next_offset == null || !executedDraft) return
        void runSearch({ ...executedDraft, offset: results.pagination.next_offset }, true)
    }, [executedDraft, results, runSearch])

    const resetSearch = useCallback(() => {
        sessionGenerationRef.current += 1
        sessionIdRef.current = null
        sessionCreationRef.current = null
        turnIdRef.current = 0
        setCurrentSession(null)
        setTurns([])
        setInput('')
        setPendingTurnId(null)
        setEditingTurnId(null)
        setResults(null)
        setExecutedDraft(null)
        setSelectedCluster(null)
    }, [])

    const loadHistory = useCallback(async (view: SearchSessionView) => {
        const requestId = historyRequestRef.current + 1
        historyRequestRef.current = requestId
        setHistoryLoading(true)
        setHistoryError(null)
        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) throw new Error('Please sign in again to load search history.')

            const response = await fetch(`/api/clusters/search/sessions?view=${view}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!response.ok) throw new Error(await responseError(response, 'Could not load search history.'))
            const sessions = (await response.json()) as SearchSessionSummary[]
            if (historyRequestRef.current === requestId) setHistorySessions(sessions)
        } catch (error) {
            if (historyRequestRef.current === requestId) {
                setHistorySessions([])
                setHistoryError(error instanceof Error ? error.message : 'Could not load search history.')
            }
        } finally {
            if (historyRequestRef.current === requestId) setHistoryLoading(false)
        }
    }, [])

    const openSearchSession = useCallback(async (sessionId: string) => {
        if (!beginHistoryAction(sessionId)) return
        const generation = sessionGenerationRef.current + 1
        sessionGenerationRef.current = generation
        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) throw new Error('Please sign in again to open this search.')

            const response = await fetch(`/api/clusters/search/sessions/${sessionId}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!response.ok) throw new Error(await responseError(response, 'Could not open this search.'))

            const session = (await response.json()) as SearchSessionDetail
            if (sessionGenerationRef.current !== generation) return
            const restoredTurns = session.turns.map((turn, index) => ({
                id: index + 1,
                userMessage: turn.user_message,
                response: turn.interpretation,
            }))
            const latestRun = session.runs.at(-1)

            sessionIdRef.current = session.id
            sessionCreationRef.current = null
            turnIdRef.current = restoredTurns.length
            setCurrentSession(session)
            setTurns(restoredTurns)
            setInput('')
            setEditingTurnId(null)
            setResults(null)
            setExecutedDraft(latestRun?.draft ?? null)
            setHistoryOpen(false)

            if (latestRun) {
                void runSearch({ ...latestRun.draft, offset: 0 }, false, false)
            }
        } catch (error) {
            if (sessionGenerationRef.current === generation) {
                toast.error(error instanceof Error ? error.message : 'Could not open this search.')
            }
        } finally {
            finishHistoryAction(sessionId)
        }
    }, [beginHistoryAction, finishHistoryAction, runSearch])

    const updateSearchSession = useCallback(async (
        sessionId: string,
        update: { title?: string; saved?: boolean; archived?: boolean },
    ) => {
        if (!beginHistoryAction(sessionId)) return
        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) throw new Error('Please sign in again to update this search.')

            const response = await fetch(`/api/clusters/search/sessions/${sessionId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(update),
            })
            if (!response.ok) throw new Error(await responseError(response, 'Could not update this search.'))

            const updated = (await response.json()) as SearchSessionSummary
            setCurrentSession(current => current?.id === updated.id ? updated : current)
            setHistorySessions(current => current.map(session => session.id === updated.id ? updated : session))
            if (historyOpen) void loadHistory(historyView)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Could not update this search.')
        } finally {
            finishHistoryAction(sessionId)
        }
    }, [beginHistoryAction, finishHistoryAction, historyOpen, historyView, loadHistory])

    const deleteSearchSession = useCallback(async (sessionId: string) => {
        if (pendingHistoryActionRef.current !== null) return
        const session = historySessions.find(item => item.id === sessionId)
        if (!window.confirm(`Delete “${session?.title ?? 'this search'}”? This cannot be undone.`)) return
        if (!beginHistoryAction(sessionId)) return

        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) throw new Error('Please sign in again to delete this search.')

            const response = await fetch(`/api/clusters/search/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!response.ok) throw new Error(await responseError(response, 'Could not delete this search.'))

            setHistorySessions(current => current.filter(item => item.id !== sessionId))
            if (sessionIdRef.current === sessionId) resetSearch()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Could not delete this search.')
        } finally {
            finishHistoryAction(sessionId)
        }
    }, [beginHistoryAction, finishHistoryAction, historySessions, resetSearch])

    const saveCurrentSearch = useCallback(async () => {
        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) throw new Error('Please sign in again to save this search.')
            const sessionId = await ensureSearchSession(token)
            if (!sessionId) throw new Error('Search history is unavailable right now.')
            await updateSearchSession(sessionId, { saved: true })
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Could not save this search.')
        }
    }, [ensureSearchSession, updateSearchSession])

    const startNewSearch = useCallback(() => {
        resetSearch()
        setHistoryOpen(false)
    }, [resetSearch])

    const setWatchedLocally = useCallback((clusterId: string, watched: boolean) => {
        setResults(current => current ? {
            ...current,
            data: current.data.map(cluster => (
                String(cluster.id) === clusterId ? { ...cluster, is_watched: watched } : cluster
            )),
        } : current)
        setSelectedCluster(current => (
            current?.id === clusterId ? { ...current, is_watched: watched } : current
        ))
    }, [])

    const handleWatch = useCallback(async (clusterId: string) => {
        setWatchedLocally(clusterId, true)
        setWatchPending(current => new Set(current).add(clusterId))
        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) throw new Error('Please sign in again')

            const response = await fetch('/api/pipeline/watch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ cluster_id: clusterId }),
            })
            if (!response.ok) throw new Error('Could not add this problem to Pipeline')

            const body = (await response.json()) as { pipeline_id?: string }
            toast.success('Added to Pipeline')
            if (body.pipeline_id) {
                const cluster = results?.data.find(item => String(item.id) === clusterId)
                setSetupProject({
                    pipelineId: body.pipeline_id,
                    name: cluster?.name || `Problem ${clusterId}`,
                })
            }
        } catch (error) {
            setWatchedLocally(clusterId, false)
            toast.error(error instanceof Error ? error.message : 'Could not add this problem to Pipeline')
        } finally {
            setWatchPending(current => {
                const next = new Set(current)
                next.delete(clusterId)
                return next
            })
        }
    }, [results, setWatchedLocally])

    const handleOpenSignal = useCallback(async (clusterId: string) => {
        const token = await auth.currentUser?.getIdToken()
        if (!token) return toast.error('Please sign in again')

        const response = await fetch('/api/pipeline/watch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ cluster_id: clusterId }),
        })
        if (!response.ok) return toast.error('Could not open this problem in Signal')

        const body = (await response.json()) as { pipeline_id: string }
        router.push(`/dashboard/discover/signal?pipelineId=${body.pipeline_id}`)
    }, [router])

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        void submitMessage()
    }

    const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            if (input.trim().length >= 2) void submitMessage()
        }
    }

    const hasConversation = turns.length > 0
    const composerPlaceholder = latestResponse?.needs_clarification && latestResponse.clarification_question
        ? 'Answer the clarification…'
        : hasConversation
          ? 'Refine this search…'
          : 'Describe the problem, people, sources, or signal you want to find…'

    return (
        <div className="relative flex h-[calc(100vh-4rem)] min-h-0 min-w-0 flex-col overflow-hidden bg-(--color-bg)">
            <div className="absolute right-4 top-3 z-20 flex items-center gap-1 rounded-xl border border-(--color-border) bg-(--color-surface)/95 p-1 backdrop-blur md:right-6">
                {hasConversation && (
                    <>
                        <button
                            type="button"
                            onClick={startNewSearch}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-(--color-text-muted) hover:bg-(--color-surface-tint) hover:text-(--color-text)"
                        >
                            <Plus size={14} aria-hidden />
                            <span className="hidden sm:inline">New</span>
                        </button>
                        <button
                            type="button"
                            disabled={currentSession?.saved || pendingSessionId === currentSession?.id}
                            onClick={() => void saveCurrentSearch()}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-(--color-text-muted) hover:bg-(--color-surface-tint) hover:text-(--color-text) disabled:cursor-default disabled:opacity-60"
                        >
                            <Bookmark size={14} fill={currentSession?.saved ? 'currentColor' : 'none'} aria-hidden />
                            <span className="hidden sm:inline">{currentSession?.saved ? 'Saved' : 'Save'}</span>
                        </button>
                    </>
                )}
                <button
                    type="button"
                    onClick={() => {
                        setHistoryOpen(true)
                        void loadHistory(historyView)
                    }}
                    aria-label="Open search history"
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-(--color-text-muted) hover:bg-(--color-surface-tint) hover:text-(--color-text)"
                >
                    <History size={14} aria-hidden />
                    <span className="hidden sm:inline">History</span>
                </button>
            </div>
            <main className="min-h-0 flex-1 overflow-y-auto">
                {!hasConversation ? (
                    <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center px-5 py-12 text-center">
                        <Image
                            src="/brand/logo_orange.svg"
                            alt="Immensity"
                            width={42}
                            height={40}
                            className="mb-5 h-10 w-auto"
                            priority
                        />
                        <h2 className="text-2xl font-semibold tracking-tight text-(--color-text) md:text-3xl">
                            What problem are you looking for?
                        </h2>
                    </div>
                ) : (
                    <div className="mx-auto w-full max-w-5xl px-4 pb-8 pt-20 md:px-6">
                        <div className="mx-auto flex max-w-3xl flex-col gap-7">
                            {turns.map((turn, index) => {
                                const isLatest = index === turns.length - 1
                                const isPending = pendingTurnId === turn.id
                                const response = turn.response

                                return (
                                    <div key={turn.id} className="flex flex-col gap-4">
                                        <div className="flex justify-end">
                                            <div className="max-w-[85%] rounded-2xl rounded-br-md bg-(--color-text) px-4 py-3 text-sm leading-6 text-(--color-bg)">
                                                {turn.userMessage}
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--color-accent) text-white">
                                                <Sparkles size={15} aria-hidden />
                                            </div>
                                            <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-(--color-border) bg-(--color-surface) p-4 shadow-sm">
                                                {isPending && (
                                                    <div className="flex items-center gap-2 text-sm text-(--color-text-muted)" role="status" aria-live="polite">
                                                        <LoaderCircle size={16} className="animate-spin" aria-hidden />
                                                        Agent is checking available filters and preparing a draft…
                                                    </div>
                                                )}

                                                {turn.error && (
                                                    <div className="flex items-start gap-2 text-sm text-(--color-error-text)" role="alert">
                                                        <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
                                                        <div>
                                                            <p className="font-medium">{turn.error}</p>
                                                            <p className="mt-1 text-xs">You can try the request again below.</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {response && (
                                                    <div className="flex flex-col gap-4">
                                                        {isAgentResponse(response) && <AgentActivity response={response} />}
                                                        <div>
                                                            <p className="text-sm leading-6 text-(--color-text)">{response.confirmation}</p>
                                                            {response.clarification_question && (
                                                                <p className="mt-2 text-sm font-semibold text-(--color-text)">
                                                                    {response.clarification_question}
                                                                </p>
                                                            )}
                                                        </div>

                                                        <FilterPills draft={response.draft} />

                                                        {response.assumptions.length > 0 && (
                                                            <div className="rounded-lg bg-(--color-blue-soft) px-3 py-2 text-xs leading-5 text-(--color-info-text)">
                                                                <span className="font-semibold">Assumptions: </span>
                                                                {response.assumptions.join(' ')}
                                                            </div>
                                                        )}
                                                        {response.unsupported.length > 0 && (
                                                            <div className="rounded-lg bg-(--color-warning-soft) px-3 py-2 text-xs leading-5 text-(--color-warning-text)">
                                                                <span className="font-semibold">Not available in database search: </span>
                                                                {response.unsupported.join(' ')}
                                                            </div>
                                                        )}
                                                        {response.fallback_used && (
                                                            <div className="flex items-start gap-2 text-xs leading-5 text-(--color-warning-text)">
                                                                <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
                                                                The search assistant used keyword fallback. Review the filters before continuing.
                                                            </div>
                                                        )}

                                                        {editingTurnId === turn.id && (
                                                            <SearchFilterEditor
                                                                draft={response.draft}
                                                                options={response.available_options}
                                                                onApply={draft => updateTurnDraft(turn.id, draft)}
                                                                onCancel={() => setEditingTurnId(null)}
                                                            />
                                                        )}

                                                        {isLatest && !response.needs_clarification && response.needs_confirmation && editingTurnId !== turn.id && (
                                                            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-(--color-border) pt-4">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setEditingTurnId(turn.id)}
                                                                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-(--color-text-muted) hover:bg-(--color-surface-tint) hover:text-(--color-text)"
                                                                >
                                                                    <SlidersHorizontal size={15} aria-hidden />
                                                                    Edit filters
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={queryLoading}
                                                                    onClick={() => void runSearch(response.draft)}
                                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-(--color-button) px-4 py-2 text-sm font-semibold text-(--color-on-button) hover:bg-(--color-button-hover) disabled:opacity-50"
                                                                >
                                                                    {queryLoading ? (
                                                                        <LoaderCircle size={15} className="animate-spin" aria-hidden />
                                                                    ) : (
                                                                        <Check size={15} aria-hidden />
                                                                    )}
                                                                    Confirm & search
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {queryLoading && (
                            <div className="mx-auto mt-8 flex max-w-3xl items-center justify-center gap-2 rounded-xl border border-(--color-border) bg-(--color-surface) py-8 text-sm text-(--color-text-muted)">
                                <LoaderCircle size={18} className="animate-spin" aria-hidden />
                                Searching the problem database…
                            </div>
                        )}

                        {results && !queryLoading && (
                            <section className="mt-10 rounded-2xl border border-(--color-border) bg-(--color-surface) px-4 py-2 shadow-sm md:px-6" aria-label="Search results">
                                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-(--color-border) py-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Database size={16} className="text-(--color-accent)" aria-hidden />
                                            <h2 className="text-sm font-semibold text-(--color-text)">
                                                {results.total} structured match{results.total === 1 ? '' : 'es'}
                                            </h2>
                                        </div>
                                        <p className="mt-1 text-xs text-(--color-text-muted)">
                                            Results from the problem database—not generated answers.
                                        </p>
                                    </div>
                                    {executedDraft && <FilterPills draft={executedDraft} />}
                                </div>

                                {results.data.length === 0 ? (
                                    <div className="py-14 text-center">
                                        <p className="text-sm font-medium text-(--color-text)">No matching problem clusters.</p>
                                        <p className="mt-1 text-xs text-(--color-text-muted)">Describe a broader search or edit the proposed filters.</p>
                                    </div>
                                ) : (
                                    results.data.map(cluster => (
                                        <SearchResultRow
                                            key={cluster.id}
                                            cluster={cluster}
                                            watchPending={watchPending.has(String(cluster.id))}
                                            onOpen={() => setSelectedCluster(mapDiscovery(cluster))}
                                            onWatch={() => void handleWatch(String(cluster.id))}
                                            onOpenSignal={() => void handleOpenSignal(String(cluster.id))}
                                        />
                                    ))
                                )}

                                {results.pagination.has_more && (
                                    <div className="flex justify-center border-t border-(--color-border) py-4">
                                        <button
                                            type="button"
                                            disabled={loadingMore}
                                            onClick={loadMore}
                                            className="rounded-lg border border-(--color-border) px-4 py-2 text-sm font-medium text-(--color-text) hover:bg-(--color-surface-tint) disabled:opacity-50"
                                        >
                                            {loadingMore ? 'Loading…' : 'Load more'}
                                        </button>
                                    </div>
                                )}
                            </section>
                        )}
                        <div ref={endRef} />
                    </div>
                )}
            </main>

            <footer className="shrink-0 bg-(--color-bg)/95 px-4 py-3 backdrop-blur md:px-6">
                <form onSubmit={handleSubmit} className="mx-auto max-w-4xl">
                    <div className="flex min-h-28 items-end gap-3 rounded-2xl border border-(--color-border-strong) bg-(--color-surface) p-3 pl-5">
                        <textarea
                            rows={3}
                            value={input}
                            onChange={event => setInput(event.target.value)}
                            onKeyDown={handleComposerKeyDown}
                            placeholder={composerPlaceholder}
                            aria-label="Search message"
                            className="max-h-48 min-h-20 flex-1 resize-none border-0 bg-transparent py-1 text-sm leading-6 text-(--color-text) outline-none ring-0 placeholder:text-(--color-text-faint) focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                            style={{ outline: 'none', boxShadow: 'none' }}
                        />
                        <button
                            type="submit"
                            disabled={input.trim().length < 2 || pendingTurnId != null}
                            aria-label="Send search message"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--color-button) text-(--color-on-button) hover:bg-(--color-button-hover) disabled:cursor-not-allowed disabled:opacity-30"
                        >
                            {pendingTurnId != null
                                ? <LoaderCircle size={17} className="animate-spin" aria-hidden />
                                : <ArrowUp size={17} aria-hidden />}
                        </button>
                    </div>
                </form>
            </footer>

            {selectedCluster && (
                <ClusterDetailPanel
                    cluster={selectedCluster}
                    onClose={() => setSelectedCluster(null)}
                    onWatch={handleWatch}
                    onOpenSignals={handleOpenSignal}
                    isWatchPending={watchPending.has(selectedCluster.id)}
                />
            )}

            {setupProject && (
                <ProjectSetupModal
                    pipelineId={setupProject.pipelineId}
                    initialName={setupProject.name}
                    onClose={() => setSetupProject(null)}
                />
            )}

            {historyOpen && (
                <SearchHistoryPanel
                    open
                    view={historyView}
                    sessions={historySessions}
                    activeSessionId={currentSession?.id ?? null}
                    loading={historyLoading}
                    error={historyError}
                    pendingSessionId={pendingSessionId}
                    onClose={() => setHistoryOpen(false)}
                    onViewChange={view => {
                        setHistoryView(view)
                        void loadHistory(view)
                    }}
                    onOpenSession={sessionId => void openSearchSession(sessionId)}
                    onNewSearch={startNewSearch}
                    onUpdateSession={(sessionId, update) => void updateSearchSession(sessionId, update)}
                    onDeleteSession={sessionId => void deleteSearchSession(sessionId)}
                />
            )}
        </div>
    )
}

export default function ExplorePage() {
    return (
        <Suspense>
            <ClusterSearchInner />
        </Suspense>
    )
}
