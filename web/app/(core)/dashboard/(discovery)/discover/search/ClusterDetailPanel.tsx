'use client'
import React, { useEffect } from 'react'
import { ClusterCardProps } from '@/components/clusters/ClusterCard'
import { momentumFor, lastSeen } from '@/components/clusters/momentum'

interface Props {
    cluster: ClusterCardProps['cluster']
    onClose: () => void
    onWatch?: (clusterId: string) => void
    onOpenSignals?: (clusterId: string) => void
    isWatchPending?: boolean
}

export default function ClusterDetailPanel({
    cluster,
    onClose,
    onWatch,
    onOpenSignals,
    isWatchPending = false,
}: Props) {
    // Close on Escape.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [onClose])

    const momentum = momentumFor(cluster.trending)
    const seen = lastSeen(cluster.last_seen_date)
    const samplePosts = cluster.sample_posts ?? []
    const sources = cluster.sources ?? []
    const chips = [cluster.opportunity_domain, cluster.opportunity_type].filter(Boolean)
    const isWatched = cluster.is_watched === true

    return (
        <>
            {/* Backdrop — click outside closes */}
            <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

            {/* Panel — full width on mobile, 480px on desktop */}
            <div
                role="dialog"
                aria-modal="true"
                className="fixed top-0 right-0 z-50 h-screen w-full md:w-[480px] bg-(--color-surface) shadow-xl border-l border-(--color-border) overflow-y-auto flex flex-col">

                {/* Header */}
                <div className="flex items-start justify-between gap-3 p-6 border-b border-(--color-border)">
                    <div className="flex flex-col gap-1 flex-1">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-(--color-text-muted)">
                            Cluster
                        </span>
                        <h2 className="font-display text-xl leading-snug text-(--color-text)">
                            {cluster.name || 'Unnamed cluster'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        title="Close"
                        aria-label="Close"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-(--color-border) text-(--color-text-muted) transition-colors hover:border-(--color-error) hover:bg-(--color-error-soft) hover:text-(--color-error)">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div className="flex flex-col gap-6 p-6">
                    {cluster.summary && (
                        <div className="flex flex-col gap-2">
                            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">
                                Summary
                            </p>
                            <p className="text-sm leading-relaxed text-(--color-text)">
                                {cluster.summary}
                            </p>
                        </div>
                    )}

                    {/* Stats row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                        <span className="text-(--color-text)">
                            <span className="font-semibold">{cluster.post_count}</span>{' '}
                            <span className="text-(--color-text-muted)">
                                post{cluster.post_count !== 1 ? 's' : ''}
                            </span>
                        </span>
                        {momentum && (
                            <span
                                className="font-medium"
                                style={{ color: momentum.color, opacity: momentum.muted ? 0.7 : 1 }}>
                                {momentum.label}
                            </span>
                        )}
                        {seen && <span className="text-(--color-text-muted)">{seen}</span>}
                    </div>

                    {chips.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {chips.map(chip => (
                                <span
                                    key={chip}
                                    className="rounded-full border border-(--color-border) px-3 py-1 text-xs text-(--color-text-muted)">
                                    {chip}
                                </span>
                            ))}
                        </div>
                    )}

                    {sources.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">
                                Sources
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {sources.map(source => (
                                    <span
                                        key={source}
                                        className="rounded-full border border-(--color-border) px-3 py-1 text-xs text-(--color-text)">
                                        {source}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sample posts */}
                    {samplePosts.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">
                                Sample posts
                            </p>
                            <ul className="flex flex-col gap-2">
                                {samplePosts.map(post => (
                                    <li
                                        key={post.id}
                                        className="border border-(--color-border) rounded-xl p-3 flex flex-col gap-1">
                                        <p className="text-sm text-(--color-text) leading-snug">{post.title}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* CTA — sticky footer */}
                <div className="mt-auto p-6 border-t border-(--color-border)">
                    {isWatched ? (
                        <button
                            onClick={() => onOpenSignals?.(cluster.id)}
                            className="w-full rounded-xl bg-(--color-button) px-4 py-2.5 text-sm font-medium text-(--color-on-button) transition-colors hover:bg-(--color-button-hover)">
                            Analyze Opportunity →
                        </button>
                    ) : (
                        <button
                            onClick={() => onWatch?.(cluster.id)}
                            disabled={isWatchPending}
                            className="w-full rounded-xl bg-(--color-button) px-4 py-2.5 text-sm font-medium text-(--color-on-button) transition-colors hover:bg-(--color-button-hover) disabled:opacity-50">
                            {isWatchPending ? 'Watching…' : '+ Watch'}
                        </button>
                    )}
                </div>
            </div>
        </>
    )
}
