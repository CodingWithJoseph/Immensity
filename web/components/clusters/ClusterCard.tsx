'use client'
import React from 'react'
import { momentumFor, lastSeen } from '@/components/clusters/momentum'

export interface ClusterCardProps {
    cluster: {
        id: string
        name: string
        summary: string
        opportunity_type: string
        opportunity_domain: string
        post_count: number
        trending: boolean | null
        last_seen_date: string | null
        sources?: string[]
        sample_posts: {
            id: string
            title: string
        }[]
        is_watched?: boolean
    }
    mode: 'authenticated' | 'public'
    onWatch?: (clusterId: string) => void
    onUnwatch?: (clusterId: string) => void
    onOpenSignals?: (clusterId: string) => void
    onCardClick?: (clusterId: string) => void
    isLoading?: boolean
}

function TypeBadge() {
    return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-(--color-text-muted)">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="5" r="3" />
                <circle cx="5" cy="19" r="3" />
                <circle cx="19" cy="19" r="3" />
                <path d="M12 8v3m0 0-5.5 6M12 11l5.5 6" />
            </svg>
            Cluster
        </span>
    )
}

export default function ClusterCard({
    cluster,
    mode,
    onWatch,
    onOpenSignals,
    onCardClick,
    isLoading = false,
}: ClusterCardProps) {
    // onUnwatch is part of the public API but the card itself exposes only
    // + Watch / Signals; unwatch is handled by the parent.
    const momentum = momentumFor(cluster.trending)
    const seen = lastSeen(cluster.last_seen_date)
    const samplePosts = cluster.sample_posts?.slice(0, 3) ?? []
    const isWatched = cluster.is_watched === true

    const clickable = mode === 'authenticated' && !!onCardClick

    return (
        <div
            onClick={clickable ? () => onCardClick?.(cluster.id) : undefined}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={
                clickable
                    ? e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onCardClick?.(cluster.id)
                        }
                    }
                    : undefined
            }
            className={`w-full flex flex-col gap-4 rounded-sm border border-(--color-border) bg-(--color-surface) p-6 transition-colors hover:border-(--color-text-muted) ${
                clickable ? 'cursor-pointer' : ''
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <TypeBadge />
                </div>
                <span className="shrink-0 text-xs font-medium text-(--color-text-muted)">
                    {cluster.post_count} post{cluster.post_count !== 1 ? 's' : ''}
                </span>
            </div>

            <h3 className="font-display text-xl leading-snug text-(--color-text)">
                {cluster.name || 'Unnamed cluster'}
            </h3>

            {cluster.summary ? (
                <h3 className="font-main text-sm leading-snug text-(--color-text) line-clamp-3">
                    {cluster.summary}
                </h3>
            ) : samplePosts.length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                    {samplePosts.map(post => (
                        <li key={post.id} className="truncate text-sm text-(--color-text-muted)" title={post.title}>
                            {post.title}
                        </li>
                    ))}
                </ul>
            ) : null}

            <div className="flex flex-col gap-1.5">
                {(momentum || seen) && (
                    <p className="flex items-center gap-1.5 text-xs">
                        {momentum && (
                            <span
                                className="font-medium"
                                style={{ color: momentum.color, opacity: momentum.muted ? 0.7 : 1 }}
                            >
                                {momentum.label}
                            </span>
                        )}
                        {momentum && seen && <span className="text-(--color-text-muted)">-</span>}
                        {seen && <span className="text-(--color-text-muted)">{seen}</span>}
                    </p>
                )}
            </div>

            <div className="flex items-center justify-end pt-1">
                {mode === 'public' ? (
                    <a
                        href="/sign-up"
                        className="text-sm font-medium text-(--color-text) transition-opacity hover:opacity-80"
                    >
                        Sign up to explore -&gt;
                    </a>
                ) : isWatched ? (
                    <button
                        onClick={e => {
                            e.stopPropagation()
                            onOpenSignals?.(cluster.id)
                        }}
                        disabled={isLoading}
                        className="rounded-sm bg-(--color-button) px-4 py-2 text-sm font-medium text-(--color-on-button) transition-colors hover:bg-(--color-button-hover) disabled:opacity-50"
                    >
                        Signals -&gt;
                    </button>
                ) : (
                    <button
                        onClick={e => {
                            e.stopPropagation()
                            onWatch?.(cluster.id)
                        }}
                        disabled={isLoading}
                        className="rounded-sm bg-(--color-button) px-4 py-2 text-sm font-medium text-(--color-on-button) transition-colors hover:bg-(--color-button-hover) disabled:opacity-50"
                    >
                        {isLoading ? 'Watching...' : '+ Watch'}
                    </button>
                )}
            </div>
        </div>
    )
}
