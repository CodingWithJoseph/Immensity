'use client'

import { useEffect, useState } from 'react'
import type { EvidenceDetail, EvidencePost, EvidenceResponse } from '@/lib/types/signals'
import ScrollArea from '@/app/(core)/dashboard/components/ScrollArea'
import { CardSkeleton } from '@/app/(core)/dashboard/(discovery)/discover/signal/ui'

type SortMode = 'engagement' | 'newest' | 'comments' | 'similarity'

function fmtDate(date: string | null): string {
    if (!date) return 'Date unavailable'
    const parsed = new Date(date)
    return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function commentText(comment: unknown): string {
    if (typeof comment === 'string') return comment
    if (comment && typeof comment === 'object') {
        const value = comment as Record<string, unknown>
        for (const key of ['body', 'text', 'comment']) {
            if (typeof value[key] === 'string') return value[key]
        }
    }
    return JSON.stringify(comment)
}

function PostRow({ post, selected, onSelect }: { post: EvidencePost; selected: boolean; onSelect: () => void }) {
    return (
        <button
            type='button'
            onClick={onSelect}
            className={`w-full p-4 text-left transition-colors ${selected ? 'bg-(--color-bg)' : 'hover:bg-(--color-bg)'}`}
        >
            <p className='line-clamp-2 text-sm font-medium text-(--color-text)'>{post.title}</p>
            <p className='mt-1 line-clamp-2 text-xs text-(--color-text-muted)'>{post.excerpt || 'No post body available.'}</p>
            <div className='mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-(--color-text-muted)'>
                <span>{post.community || post.source || 'Unknown source'}</span>
                <span>{post.engagement ?? 0} score</span>
                <span>{post.numComments ?? 0} comments</span>
                <span>{fmtDate(post.observedAt)}</span>
            </div>
        </button>
    )
}

function DetailPane({ detail, loading }: { detail: EvidenceDetail | null; loading: boolean }) {
    return (
        <section className='flex min-h-0 min-w-0 flex-col overflow-hidden bg-(--color-surface)'>
            <div className='shrink-0 px-5 py-4'>
                <h2 className='text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)'>Post Detail</h2>
            </div>
            <ScrollArea className='flex-1' contentClassName='px-5 pb-6' ariaLabel='Show more post detail'>
                {loading ? (
                    <CardSkeleton lines={8} height='h-4' />
                ) : !detail ? (
                    <p className='text-sm text-(--color-text-muted)'>Select a post to inspect it.</p>
                ) : (
                    <div className='flex min-w-0 flex-col gap-5'>
                        <div>
                            <p className='text-[10px] font-semibold uppercase tracking-widest text-(--color-text-muted)'>
                                {detail.community || detail.source || 'Source post'}
                            </p>
                            <h3 className='mt-2 text-xl font-semibold leading-snug text-(--color-text)'>{detail.title}</h3>
                            <div className='mt-3 flex flex-wrap gap-3 text-xs text-(--color-text-muted)'>
                                {detail.author && <span>by {detail.author}</span>}
                                <span>{detail.engagement ?? 0} score</span>
                                <span>{detail.numComments ?? 0} comments</span>
                                {detail.upvoteRatio != null && <span>{Math.round(detail.upvoteRatio * 100)}% upvoted</span>}
                                {detail.similarityScore != null && <span>{Math.round(detail.similarityScore * 100)}% cluster similarity</span>}
                                <span>{detail.dateType === 'observed' ? 'Observed' : 'Posted'} {fmtDate(detail.observedAt)}</span>
                            </div>
                        </div>
                        <div className='whitespace-pre-wrap text-sm leading-relaxed text-(--color-text)'>{detail.body || 'No post body available.'}</div>
                        {detail.topComments.length > 0 && (
                            <section>
                                <h3 className='mb-3 text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)'>Top Comments</h3>
                                <div className='flex flex-col gap-2'>
                                    {detail.topComments.map((comment, index) => (
                                        <blockquote key={index} className='border-l border-(--color-border) pl-3 text-sm text-(--color-text-muted)'>
                                            {commentText(comment)}
                                        </blockquote>
                                    ))}
                                </div>
                            </section>
                        )}
                        {detail.url && (
                            <a href={detail.url} target='_blank' rel='noreferrer' className='self-start text-sm font-medium text-(--color-text) hover:underline'>
                                Open original post
                            </a>
                        )}
                    </div>
                )}
            </ScrollArea>
        </section>
    )
}

export default function PostsBrowser({ pipelineId }: { pipelineId: string }) {
    const [query, setQuery] = useState('')
    const [debouncedQuery, setDebouncedQuery] = useState('')
    const [community, setCommunity] = useState('')
    const [sort, setSort] = useState<SortMode>('engagement')
    const [page, setPage] = useState(1)
    const [response, setResponse] = useState<EvidenceResponse | null>(null)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [detailState, setDetailState] = useState<{ id: string; detail: EvidenceDetail | null } | null>(null)

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300)
        return () => clearTimeout(timer)
    }, [query])

    useEffect(() => {
        const ctrl = new AbortController()
        void (async () => {
            try {
                const params = new URLSearchParams({ sort, page: String(page), pageSize: '50' })
                if (debouncedQuery) params.set('q', debouncedQuery)
                if (community) params.set('community', community)
                const res = await fetch(`/api/pipeline/${pipelineId}/posts?${params}`, { signal: ctrl.signal })
                if (!res.ok) return
                const next = (await res.json()) as EvidenceResponse
                setResponse(next)
                setSelectedId(current => next.data.some(post => post.id === current) ? current : next.data[0]?.id ?? null)
            } catch (error) {
                if ((error as Error).name !== 'AbortError') {
                    console.warn('Posts list request failed:', error)
                }
            }
        })()
        return () => ctrl.abort()
    }, [pipelineId, debouncedQuery, community, sort, page])

    useEffect(() => {
        if (!selectedId) return
        const ctrl = new AbortController()
        void (async () => {
            try {
                const res = await fetch(`/api/pipeline/${pipelineId}/posts/${selectedId}`, { signal: ctrl.signal })
                setDetailState({
                    id: selectedId,
                    detail: res.ok ? (await res.json()) as EvidenceDetail : null,
                })
            } catch (error) {
                if ((error as Error).name !== 'AbortError') {
                    setDetailState({ id: selectedId, detail: null })
                }
            }
        })()
        return () => ctrl.abort()
    }, [pipelineId, selectedId])

    const totalPages = response ? Math.max(1, Math.ceil(response.total / response.pageSize)) : 1
    const detail = detailState?.id === selectedId ? detailState.detail : null
    const detailLoading = selectedId != null && detailState?.id !== selectedId

    return (
        <div className='flex h-full min-h-0 min-w-0 flex-col gap-4 overflow-hidden'>
            <div className='grid shrink-0 grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px_180px]'>
                <input
                    value={query}
                    onChange={event => { setQuery(event.target.value); setPage(1) }}
                    placeholder='Search post titles and bodies...'
                    className='min-w-0 bg-(--color-surface) px-4 py-2.5 text-sm'
                />
                <select
                    value={community}
                    onChange={event => { setCommunity(event.target.value); setPage(1) }}
                    className='min-w-0 bg-(--color-surface) px-3 py-2.5 text-sm'
                >
                    <option value=''>All communities</option>
                    {(response?.communities ?? []).map(value => <option key={value} value={value}>{value}</option>)}
                </select>
                <select
                    value={sort}
                    onChange={event => { setSort(event.target.value as SortMode); setPage(1) }}
                    className='min-w-0 bg-(--color-surface) px-3 py-2.5 text-sm'
                >
                    <option value='engagement'>Top engagement</option>
                    <option value='newest'>Newest observed</option>
                    <option value='comments'>Most comments</option>
                    <option value='similarity'>Cluster similarity</option>
                </select>
            </div>

            <div className='grid min-h-0 min-w-0 flex-1 grid-cols-1 grid-rows-2 gap-4 overflow-hidden lg:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.6fr)] lg:grid-rows-1'>
                <section className='flex min-h-0 min-w-0 flex-col overflow-hidden bg-(--color-surface)'>
                    <div className='flex shrink-0 items-center justify-between gap-3 px-4 py-4'>
                        <h2 className='text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)'>Posts</h2>
                        <span className='text-xs text-(--color-text-muted)'>
                            {response ? response.total.toLocaleString() : 'Loading...'}
                        </span>
                    </div>
                    <ScrollArea className='flex-1' ariaLabel='Show more posts'>
                        {response == null ? <div className='p-4'><CardSkeleton lines={6} /></div>
                            : response.data.length === 0 ? <p className='p-8 text-center text-sm text-(--color-text-muted)'>No posts match these filters.</p>
                            : response.data.map(post => <PostRow key={post.id} post={post} selected={post.id === selectedId} onSelect={() => setSelectedId(post.id)} />)}
                    </ScrollArea>
                    <div className='flex shrink-0 items-center justify-between px-4 py-3 text-xs'>
                        <button disabled={page <= 1} onClick={() => setPage(value => value - 1)} className='disabled:opacity-40'>Previous</button>
                        <span className='text-(--color-text-muted)'>Page {page} of {totalPages}</span>
                        <button disabled={page >= totalPages} onClick={() => setPage(value => value + 1)} className='disabled:opacity-40'>Next</button>
                    </div>
                </section>
                <DetailPane detail={detail} loading={detailLoading} />
            </div>
        </div>
    )
}
