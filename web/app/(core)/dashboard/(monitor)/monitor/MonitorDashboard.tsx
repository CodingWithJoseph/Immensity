'use client'

import Link from 'next/link'
import { formatDateTime } from '@/lib/format'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { PipelineCard } from '@/lib/types/cluster'
import { fetchJson, ApiData } from '@/lib/fetchJson'
import { routes } from '@/app/util/routes'
import type { MonitorView } from '@/lib/monitoring/lenses'
import { useWorkspace } from '@/app/(core)/dashboard/contexts/WorkspaceContext'
import RevenuePanel from './components/RevenuePanel'
import RevenueInsightsPanel from './components/RevenueInsightsPanel'
import SessionsPanel from './components/SessionsPanel'
import ExperiencePanel from './components/ExperiencePanel'
import ExplorerPanel from './components/ExplorerPanel'
import IssuesPanel from './components/IssuesPanel'
import ReleasePanel from './components/ReleasePanel'
import LogsPanel from './components/LogsPanel'
import CommandCenterPanel from './components/CommandCenterPanel'
import ProblemsPanel from './components/ProblemsPanel'
import InvestigatePanel from './components/InvestigatePanel'
import OverTimeChart from './components/OverTimeChart'
import UsageOverview from './components/UsageOverview'
import FlowGraphView from './components/FlowGraphView'
import MonitorPageFrame from './components/MonitorPageFrame'
import type { ErrorMetrics, PortfolioProduct, RevenueMetrics, UsageMetrics } from './types'

type MonitorDashboardView = Exclude<MonitorView, 'portfolio'>

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


function TrafficPanel({ usage }: { usage: UsageMetrics | null }) {
    const summary = usage?.summary14d
    const windowDays = usage?.windowDays ?? 14
    const pageviews = usage?.recentEvents.filter(event => event.eventType === 'pageview') ?? []
    return (
        <section className="flex flex-col gap-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-md bg-(--color-card) p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">{windowDays}d visitors</p>
                    <p className="mt-2 text-2xl font-semibold text-(--color-text)">{summary?.visitors ?? 0}</p>
                </div>
                <div className="rounded-md bg-(--color-card) p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">{windowDays}d pageviews</p>
                    <p className="mt-2 text-2xl font-semibold text-(--color-text)">{summary?.pageviews ?? 0}</p>
                </div>
                <div className="rounded-md bg-(--color-card) p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">Known visitors</p>
                    <p className="mt-2 text-2xl font-semibold text-(--color-text)">{summary?.activeUsers ?? 0}</p>
                </div>
                <div className="rounded-md bg-(--color-card) p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">Total events</p>
                    <p className="mt-2 text-2xl font-semibold text-(--color-text)">{usage?.totalEvents ?? 0}</p>
                </div>
            </div>
            <section className="rounded-md bg-(--color-card)">
                <div className="border-b border-(--color-border) px-5 py-4">
                    <p className="text-sm font-semibold text-(--color-text)">Recent pageviews</p>
                </div>
                <div className="divide-y divide-(--color-border)">
                    {pageviews.length ? pageviews.map(event => (
                        <div key={event.id} className="grid gap-2 p-5 text-sm md:grid-cols-[minmax(0,1fr)_140px]">
                            <span className="truncate text-(--color-text-muted)">{event.url || 'No URL'}</span>
                            <span className="text-(--color-text-muted)">{formatDateTime(event.occurredAt, 'Not yet')}</span>
                        </div>
                    )) : (
                        <p className="p-5 text-sm text-(--color-text-muted)">Waiting for traffic.</p>
                    )}
                </div>
            </section>
        </section>
    )
}

function ErrorsPanel({ errors, setupHref, pipelineId }: { errors: ErrorMetrics | null; setupHref: string; pipelineId: string | null }) {
    const summary = errors?.summary14d
    const windowDays = errors?.windowDays ?? 14
    const hasSource = Boolean(errors?.source)
    const recent = errors?.recentErrors ?? []

    if (!hasSource) {
        return (
            <section className="rounded-md bg-(--color-card) p-8">
                <p className="text-sm font-semibold text-(--color-text)">Errors</p>
                <p className="mt-2 text-sm text-(--color-text-muted)">
                    Errors are captured by the same usage snippet. Add the usage install from Setup, then errors will appear here automatically.
                </p>
                <Link
                    href={setupHref}
                    className="mt-4 inline-flex rounded-md border border-(--color-border) px-3 py-2 text-sm font-medium text-(--color-text) hover:bg-(--color-bg)"
                >
                    Open setup
                </Link>
            </section>
        )
    }

    const ratePct = summary?.errorsPerSession != null ? `${(summary.errorsPerSession * 100).toFixed(1)}%` : '—'

    return (
        <section className="flex flex-col gap-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-md bg-(--color-card) p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">{windowDays}d errors</p>
                    <p className="mt-2 text-2xl font-semibold text-(--color-text)">{summary?.errors ?? 0}</p>
                </div>
                <div className="rounded-md bg-(--color-card) p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">Open issues</p>
                    <p className="mt-2 text-2xl font-semibold text-(--color-text)">{summary?.openIssues ?? 0}</p>
                </div>
                <div className="rounded-md bg-(--color-card) p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">Affected sessions</p>
                    <p className="mt-2 text-2xl font-semibold text-(--color-text)">{summary?.affectedSessions ?? 0}</p>
                </div>
                <div className="rounded-md bg-(--color-card) p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">Errors / session</p>
                    <p className="mt-2 text-2xl font-semibold text-(--color-text)">{ratePct}</p>
                </div>
            </div>

            <ReleasePanel pipelineId={pipelineId} />

            <IssuesPanel pipelineId={pipelineId} />

            <section className="rounded-md bg-(--color-card)">
                <div className="border-b border-(--color-border) px-5 py-4">
                    <p className="text-sm font-semibold text-(--color-text)">Recent errors</p>
                </div>
                <div className="divide-y divide-(--color-border)">
                    {recent.length ? recent.map(event => (
                        <div key={event.id} className="grid gap-2 p-5 text-sm md:grid-cols-[minmax(0,1fr)_140px]">
                            <span className="truncate text-(--color-text-muted)">{event.message}</span>
                            <span className="text-(--color-text-muted)">{formatDateTime(event.occurredAt, 'Not yet')}</span>
                        </div>
                    )) : (
                        <p className="p-5 text-sm text-(--color-text-muted)">Waiting for errors.</p>
                    )}
                </div>
            </section>
        </section>
    )
}

export default function MonitorDashboard({ initialPipelineId = null, view = 'command' }: { initialPipelineId?: string | null; view?: MonitorDashboardView }) {
    const searchParams = useSearchParams()
    const queryPipelineId = searchParams.get('pipelineId')
    const { selectedPipelineId, setSelectedPipelineId, hydrated } = useWorkspace()
    const [products, setProducts] = useState<PipelineCard[]>([])
    const [pipelineId, setPipelineId] = useState<string | null>(initialPipelineId ?? queryPipelineId)
    const [product, setProduct] = useState<PortfolioProduct | null>(null)
    const [usage, setUsage] = useState<UsageMetrics | null>(null)
    const [revenue, setRevenue] = useState<RevenueMetrics | null>(null)
    const [errors, setErrors] = useState<ErrorMetrics | null>(null)
    const [loadingProducts, setLoadingProducts] = useState(true)
    const [loadingProduct, setLoadingProduct] = useState(false)
    const [syncingRevenue, setSyncingRevenue] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [syncError, setSyncError] = useState<string | null>(null)

    useEffect(() => {
        let active = true
        void (async () => {
            try {
                const json = await fetchJson<{ data: PipelineCard[] }>('/api/portfolio')
                if (!active) return
                const data = json?.data ?? []
                setProducts(data)
                setError(null)
                if (data.length > 0) {
                    setPipelineId(current => {
                        const requested = initialPipelineId ?? queryPipelineId
                        if (requested && data.some(item => item.id === requested)) return requested
                        if (current && data.some(item => item.id === current)) return current
                        const remembered = hydrated ? selectedPipelineId : null
                        return data.some(item => item.id === remembered) ? remembered : data[0].id
                    })
                } else {
                    setPipelineId(null)
                }
            } catch (err) {
                if (active) setError(err instanceof Error ? err.message : 'Something went wrong loading your launched products.')
            } finally {
                if (active) setLoadingProducts(false)
            }
        })()
        return () => {
            active = false
        }
    }, [hydrated, initialPipelineId, queryPipelineId, selectedPipelineId])

    async function loadProduct(id: string) {
        setLoadingProduct(true)
        setError(null)
        try {
            const [productJson, usageJson, revenueJson, errorsJson] = await Promise.all([
                requestJson<ApiData<PortfolioProduct>>(`/api/portfolio/${id}`),
                requestJson<ApiData<UsageMetrics>>(`/api/monitor/${id}/usage`),
                requestJson<ApiData<RevenueMetrics>>(`/api/portfolio/${id}/revenue`),
                requestJson<ApiData<ErrorMetrics>>(`/api/monitor/${id}/errors`),
            ])
            setProduct(productJson.data)
            setUsage(usageJson.data)
            setRevenue(revenueJson.data)
            setErrors(errorsJson.data)
        } catch (err) {
            setProduct(null)
            setUsage(null)
            setRevenue(null)
            setErrors(null)
            setError(err instanceof Error ? err.message : 'Could not load product dashboard')
        } finally {
            setLoadingProduct(false)
        }
    }

    useEffect(() => {
        if (!pipelineId) {
            setProduct(null)
            setUsage(null)
            setRevenue(null)
            setErrors(null)
            return
        }
        setSelectedPipelineId(pipelineId)
        // Product detail loading is intentionally driven by the selected row/URL.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadProduct(pipelineId)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pipelineId])

    async function syncRevenue() {
        if (!pipelineId) return
        setSyncingRevenue(true)
        setError(null)
        setSyncError(null)
        try {
            const json = await requestJson<ApiData<RevenueMetrics>>(`/api/portfolio/${pipelineId}/revenue/sync`, { method: 'POST' })
            setRevenue(json.data)
            await loadProduct(pipelineId)
        } catch (err) {
            setSyncError(err instanceof Error ? err.message : 'Could not sync revenue')
        } finally {
            setSyncingRevenue(false)
        }
    }

    const revenueSource = revenue?.source ?? product?.revenueSource ?? null
    const setupHref = `${routes.core.monitorSetup}${pipelineId ? `?pipelineId=${pipelineId}` : ''}`

    return (
        <div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto px-6 py-6">
            {!pipelineId && !loadingProducts && products.length > 0 && (
                <p className="text-sm text-(--color-text-muted)">Select a launched product from the top bar to view this page.</p>
            )}

            {error && (
                <div className="rounded-md border border-(--color-error) px-4 py-3 text-sm text-(--color-error)">
                    {error}
                </div>
            )}

            {!loadingProducts && products.length === 0 && (
                <div className="rounded-md border border-(--color-border) bg-(--color-card) p-8">
                    <p className="text-sm font-medium text-(--color-text)">No launched products yet. Launch a project from Pipeline to see it here.</p>
                    <Link
                        href={routes.core.pipeline}
                        className="mt-4 inline-flex rounded-md bg-(--color-button) px-4 py-2 text-sm font-medium text-(--color-on-button) transition-colors hover:bg-(--color-button-hover)"
                    >
                        Go to Pipeline
                    </Link>
                </div>
            )}

            {loadingProduct && <p className="text-sm text-(--color-text-muted)">Loading monitor...</p>}

            {!loadingProduct && product && (
                <MonitorPageFrame
                    view={view}
                    pipelineId={pipelineId}
                    productName={product.displayName ?? product.name ?? null}
                    lastSeenAt={usage?.lastSeenAt ?? null}
                >
                    {view === 'command' && <CommandCenterPanel pipelineId={pipelineId} />}
                    {view === 'traffic' && <TrafficPanel usage={usage} />}
                    {view === 'usage' && <UsageOverview usage={usage} />}
                    {view === 'flow' && <FlowGraphView pipelineId={pipelineId} />}
                    {view === 'sessions' && <SessionsPanel pipelineId={pipelineId} />}
                    {view === 'experience' && (
                        <div className="flex flex-col gap-6">
                            <ExplorerPanel pipelineId={pipelineId} />
                            <ExperiencePanel pipelineId={pipelineId} />
                        </div>
                    )}
                    {view === 'errors' && (
                        <div className="flex flex-col gap-6">
                            <OverTimeChart pipelineId={pipelineId} />
                            <ErrorsPanel errors={errors} setupHref={setupHref} pipelineId={pipelineId} />
                        </div>
                    )}
                    {view === 'logs' && <LogsPanel pipelineId={pipelineId} />}
                    {view === 'problems' && <ProblemsPanel pipelineId={pipelineId} />}
                    {view === 'investigate' && <InvestigatePanel pipelineId={pipelineId} />}
                    {view === 'revenue' && (
                        <RevenuePanel
                            revenue={revenue}
                            source={revenueSource}
                            saving={false}
                            syncing={syncingRevenue}
                            syncError={syncError}
                            setupHref={setupHref}
                            onSyncRevenue={() => void syncRevenue()}
                        />
                    )}
                    {view === 'insights' && <RevenueInsightsPanel pipelineId={pipelineId} />}
                </MonitorPageFrame>
            )}
        </div>
    )
}
