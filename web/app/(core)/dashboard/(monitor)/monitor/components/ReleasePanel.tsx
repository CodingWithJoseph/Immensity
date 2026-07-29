'use client'

import { useEffect, useState } from 'react'
import { fetchJson, ApiData } from '@/lib/fetchJson'
import type { ErrorsByReleaseMetrics, ReleaseErrorStat } from '../types'


function formatRate(rate: number | null) {
    if (rate == null) return '—'
    return `${(rate * 100).toFixed(1)}%`
}

// Compare each release's error rate to the next-older release with a rate, so a
// rising rate after a deploy reads as a regression.
function regressionFlags(releases: ReleaseErrorStat[]): Record<string, boolean> {
    const flags: Record<string, boolean> = {}
    for (let i = 0; i < releases.length; i++) {
        const current = releases[i].errorsPerSession
        if (current == null) continue
        const older = releases.slice(i + 1).find(r => r.errorsPerSession != null)
        if (older?.errorsPerSession != null && current > older.errorsPerSession) {
            flags[releases[i].release] = true
        }
    }
    return flags
}

export default function ReleasePanel({ pipelineId }: { pipelineId: string | null }) {
    const [data, setData] = useState<ErrorsByReleaseMetrics | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!pipelineId) return
        let active = true
        void (async () => {
            setLoading(true)
            setError(null)
            try {
                const json = await fetchJson<ApiData<ErrorsByReleaseMetrics>>(`/api/monitor/${pipelineId}/errors/by-release`)
                if (active) setData(json?.data ?? null)
            } catch (err) {
                if (active) setError(err instanceof Error ? err.message : 'Could not load releases')
            } finally {
                if (active) setLoading(false)
            }
        })()
        return () => { active = false }
    }, [pipelineId])

    const releases = data?.releases ?? []
    const flags = regressionFlags(releases)

    // Nothing to compare across yet — keep the Errors view uncluttered.
    if (!loading && !error && releases.length < 2) return null

    return (
        <section className="rounded-md bg-(--color-card)">
            <div className="border-b border-(--color-border) px-5 py-4">
                <p className="text-sm font-semibold text-(--color-text)">By release</p>
                <p className="mt-1 text-xs text-(--color-text-muted)">Error rate per release — did the deploy regress? Newest first.</p>
            </div>
            {loading && <p className="px-5 py-4 text-sm text-(--color-text-muted)">Loading releases…</p>}
            {error && <p className="px-5 py-4 text-sm text-(--color-error)">{error}</p>}
            {!loading && !error && (
                <>
                    <div className="grid grid-cols-[minmax(0,1fr)_80px_80px_110px] gap-2 px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted)">
                        <span>Release</span>
                        <span className="text-right">Errors</span>
                        <span className="text-right">Users</span>
                        <span className="text-right">Err / session</span>
                    </div>
                    <div className="divide-y divide-(--color-border)">
                        {releases.map(release => {
                            const regressed = flags[release.release]
                            return (
                                <div key={release.release} className="grid grid-cols-[minmax(0,1fr)_80px_80px_110px] gap-2 px-5 py-3 text-sm">
                                    <span className="flex items-center gap-2 truncate">
                                        <span className="truncate text-(--color-text)" title={release.release}>{release.release}</span>
                                        {regressed && <span className="shrink-0 rounded-full border border-(--color-error) px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-(--color-error)">regressed</span>}
                                    </span>
                                    <span className="text-right text-(--color-text-muted)">{release.errors}</span>
                                    <span className="text-right text-(--color-text-muted)">{release.affectedUsers}</span>
                                    <span className={`text-right ${regressed ? 'text-(--color-error)' : 'text-(--color-text-muted)'}`}>{formatRate(release.errorsPerSession)}</span>
                                </div>
                            )
                        })}
                    </div>
                </>
            )}
        </section>
    )
}
