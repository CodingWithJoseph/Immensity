'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import DemoClusterCard from '@/app/(landing)/demo/DemoClusterCard'
import { SkeletonCards } from '@/components/Skeleton'

const API_URL = process.env.NEXT_PUBLIC_API_URL
const DEBOUNCE_MS = 300
const SEARCH_CAP_KEY = 'demo_search_used'

type PublicCluster = {
    id: number
    name: string
    summary: string
    post_count: number
    growth_rate: number | null
    sample_posts: { id: string; title: string }[]
}

export default function DemoClusters({ initialQuery = '' }: { initialQuery?: string }) {
    const prefilledQuery = initialQuery.trim()
    const [query, setQuery] = useState(prefilledQuery)
    const [debouncedQuery, setDebouncedQuery] = useState(prefilledQuery.length >= 2 ? prefilledQuery : '')
    const [clusters, setClusters] = useState<PublicCluster[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [searchUsed, setSearchUsed] = useState(false)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (typeof window !== 'undefined' && sessionStorage.getItem(SEARCH_CAP_KEY) === 'true') {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSearchUsed(true)
        }
    }, [])

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            setDebouncedQuery(query.trim().length >= 2 ? query.trim() : '')
        }, DEBOUNCE_MS)
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [query])

    const fetchClusters = useCallback(async (search: string) => {
        setLoading(true)
        setError(false)
        try {
            if (!API_URL) {
                setError(true)
                return
            }
            const isSearch = search.length >= 2
            const url = isSearch
                ? `${API_URL}/public/search?q=${encodeURIComponent(search)}`
                : `${API_URL}/public/clusters`
            const response = await fetch(url)
            if (!response.ok) {
                setError(true)
                return
            }
            const json = await response.json()
            setClusters(Array.isArray(json?.data) ? json.data : [])
            if (isSearch) {
                setSearchUsed(true)
                if (typeof window !== 'undefined') sessionStorage.setItem(SEARCH_CAP_KEY, 'true')
            }
        } catch {
            setError(true)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchClusters(debouncedQuery)
    }, [debouncedQuery, fetchClusters])

    return (
        <section id="clusters" className="pf-demo-results">
            <div className="pf-shell">
                <div className="pf-demo-results__heading">
                    <div>
                        <p className="pf-eyebrow">Live clusters</p>
                        <h2>Where demand is concentrating.</h2>
                    </div>
                    <p>Real opportunity clusters from the pipeline. Search them, then sign up to start watching.</p>
                </div>

                <div className="pf-demo-search">
                    <input
                        type="text"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        disabled={searchUsed && !prefilledQuery}
                        readOnly={Boolean(prefilledQuery)}
                        placeholder="Search clusters..."
                    />
                    {query && !searchUsed && !prefilledQuery && (
                        <button onClick={() => setQuery('')} title="Clear search" aria-label="Clear search">X</button>
                    )}
                </div>

                {searchUsed && (
                    <div className="pf-demo-banner">
                        <p>You have used your free demo search.</p>
                        <a href="/sign-up">Sign up to search more opportunities →</a>
                    </div>
                )}

                {loading && <SkeletonCards count={6} className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3" cardClassName="h-56" />}

                {!loading && error && (
                    <div className="py-16 text-center">
                        <p className="font-semibold">Data temporarily unavailable</p>
                        <p className="mt-2 text-sm text-(--ink-muted)">Please check back in a little while.</p>
                    </div>
                )}

                {!loading && !error && clusters.length === 0 && (
                    <div className="py-16 text-center">
                        <p className="font-semibold">{debouncedQuery ? `No clusters match "${debouncedQuery}".` : 'No clusters yet.'}</p>
                        <p className="mt-2 text-sm text-(--ink-muted)">{debouncedQuery ? 'Try broader terms.' : 'The pipeline runs nightly.'}</p>
                    </div>
                )}

                {!loading && !error && clusters.length > 0 && (
                    <div className="pf-demo-grid">
                        {clusters.map((cluster) => (
                            <DemoClusterCard key={cluster.id} cluster={{ ...cluster, sample_posts: cluster.sample_posts ?? [] }} />
                        ))}
                    </div>
                )}
            </div>
        </section>
    )
}
