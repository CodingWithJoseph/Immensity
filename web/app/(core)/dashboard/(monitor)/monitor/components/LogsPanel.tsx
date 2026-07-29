'use client'

import { useEffect, useState } from 'react'
import { fetchJson, ApiData } from '@/lib/fetchJson'
import type { LogLevel, LogLine, LogsMetrics } from '../types'


const LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error']

function levelTone(level: LogLevel) {
    if (level === 'error') return 'text-(--color-error)'
    if (level === 'warn') return 'text-(--color-text)'
    return 'text-(--color-text-muted)'
}

function formatTime(value: string | null) {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' })
}

function LogRow({ log }: { log: LogLine }) {
    return (
        <div className="grid grid-cols-[64px_minmax(0,1fr)_140px] gap-3 px-5 py-3 text-sm">
            <span className={`text-xs font-semibold uppercase ${levelTone(log.level)}`}>{log.level}</span>
            <span className="min-w-0">
                <span className="block truncate text-(--color-text)" title={log.message}>{log.message}</span>
                {log.url && <span className="block truncate text-xs text-(--color-text-muted)" title={log.url}>{log.url}</span>}
            </span>
            <span className="text-right text-(--color-text-muted)">{formatTime(log.occurredAt)}</span>
        </div>
    )
}

export default function LogsPanel({ pipelineId }: { pipelineId: string | null }) {
    const [data, setData] = useState<LogsMetrics | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [level, setLevel] = useState<LogLevel | null>(null)
    const [query, setQuery] = useState('')
    const [debounced, setDebounced] = useState('')

    useEffect(() => {
        const t = setTimeout(() => setDebounced(query.trim()), 300)
        return () => clearTimeout(t)
    }, [query])

    useEffect(() => {
        if (!pipelineId) return
        let active = true
        void (async () => {
            setLoading(true)
            setError(null)
            const params = new URLSearchParams()
            if (level) params.set('level', level)
            if (debounced) params.set('q', debounced)
            try {
                const json = await fetchJson<ApiData<LogsMetrics>>(`/api/monitor/${pipelineId}/logs?${params.toString()}`)
                if (active) setData(json?.data ?? null)
            } catch (err) {
                if (active) setError(err instanceof Error ? err.message : 'Could not load logs')
            } finally {
                if (active) setLoading(false)
            }
        })()
        return () => { active = false }
    }, [pipelineId, level, debounced])

    const counts = data?.levelCounts
    const logs = data?.logs ?? []
    const windowDays = data?.windowDays ?? 14

    return (
        <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => setLevel(null)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${level === null ? 'border-(--color-text) text-(--color-text)' : 'border-(--color-border) text-(--color-text-muted)'}`}
                >
                    All
                </button>
                {LEVELS.map(lvl => (
                    <button
                        key={lvl}
                        type="button"
                        onClick={() => setLevel(level === lvl ? null : lvl)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${level === lvl ? 'border-(--color-text) text-(--color-text)' : 'border-(--color-border) text-(--color-text-muted)'}`}
                    >
                        {lvl} {counts ? `(${counts[lvl]})` : ''}
                    </button>
                ))}
                <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search messages…"
                    className="ml-auto w-56 rounded-md border border-(--color-border) bg-(--color-bg) px-3 py-1.5 text-sm text-(--color-text) placeholder:text-(--color-text-muted)"
                />
            </div>

            <section className="rounded-md bg-(--color-card)">
                <div className="border-b border-(--color-border) px-5 py-4">
                    <p className="text-sm font-semibold text-(--color-text)">Logs</p>
                    <p className="mt-1 text-xs text-(--color-text-muted)">Last {windowDays} days · filter by level and message.</p>
                </div>
                {loading && <p className="px-5 py-4 text-sm text-(--color-text-muted)">Loading logs…</p>}
                {error && <p className="px-5 py-4 text-sm text-(--color-error)">{error}</p>}
                {!loading && !error && (
                    <div className="divide-y divide-(--color-border)">
                        {logs.length ? logs.map(log => <LogRow key={log.id} log={log} />) : (
                            <p className="px-5 py-4 text-sm text-(--color-text-muted)">No logs match. Call window.problemFinderUsage.log(level, message) to send some.</p>
                        )}
                    </div>
                )}
            </section>
        </section>
    )
}
