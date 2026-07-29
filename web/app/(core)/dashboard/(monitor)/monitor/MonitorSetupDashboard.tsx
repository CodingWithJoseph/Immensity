'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { PipelineCard } from '@/lib/types/cluster'
import { fetchJson, ApiData } from '@/lib/fetchJson'
import { usePlan } from '@/lib/usePlan'
import { routes } from '@/app/util/routes'
import { useWorkspace } from '@/app/(core)/dashboard/contexts/WorkspaceContext'
import UsageSetupPanel from './components/UsageSetupPanel'
import type { AlertSettings, PortfolioProduct, RevenueMetrics, UsageMetrics, UsageSource } from './types'

type SetupTask = 'usage' | 'traffic' | 'revenue' | 'errors' | 'alerts'

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

function StatusBadge({ label, strong = false }: { label: string; strong?: boolean }) {
    return (
        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${strong ? 'border-(--color-text) text-(--color-text)' : 'border-(--color-border) text-(--color-text-muted)'}`}>
            {label}
        </span>
    )
}

function TaskTabs({ active, onChange }: { active: SetupTask; onChange: (task: SetupTask) => void }) {
    const tasks: { key: SetupTask; label: string }[] = [
        { key: 'usage', label: 'Usage' },
        { key: 'traffic', label: 'Traffic' },
        { key: 'revenue', label: 'Revenue' },
        { key: 'errors', label: 'Errors' },
        { key: 'alerts', label: 'Alerts' },
    ]
    return (
        <div className="flex flex-wrap gap-2 rounded-md border border-(--color-border) bg-(--color-card) p-2">
            {tasks.map(task => (
                <button
                    key={task.key}
                    type="button"
                    onClick={() => onChange(task.key)}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${active === task.key ? 'bg-(--color-text) text-(--color-bg)' : 'text-(--color-text-muted) hover:bg-(--color-bg) hover:text-(--color-text)'}`}
                >
                    {task.label}
                </button>
            ))}
        </div>
    )
}

function TrafficSetupPanel({ source }: { source: UsageSource | null }) {
    const ready = Boolean(source)
    const live = Boolean(source?.lastSeenAt)
    return (
        <section className="rounded-md bg-(--color-card) p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-(--color-text)">Traffic setup</p>
                    <p className="mt-1 text-sm text-(--color-text-muted)">Set up pageview and visitor collection for the Traffic page.</p>
                </div>
                <StatusBadge label={live ? 'Receiving traffic' : ready ? 'Usage source ready' : 'Needs usage setup'} strong={live} />
            </div>
            <p className="mt-3 text-sm text-(--color-text-muted)">
                Traffic uses the same first-party usage stream for pageviews and visitors. Start with Usage setup, then open the launched product once to confirm traffic is arriving.
            </p>
            <div className="mt-5 rounded-md border border-(--color-border) bg-(--color-bg) p-4">
                <p className="text-sm font-medium text-(--color-text)">First-party traffic stream</p>
                <p className="mt-1 text-sm text-(--color-text-muted)">Pageviews and visitors will be collected by our monitor script after Usage setup is installed.</p>
            </div>
        </section>
    )
}

function RevenueSetupPanel({
    revenue,
    saving,
    onConnectStripe,
}: {
    revenue: RevenueMetrics | null
    saving: boolean
    onConnectStripe: () => void
}) {
    const source = revenue?.source ?? null
    const connected = source?.status === 'connected'
    const needsAttention = source?.status === 'needs_attention'
    return (
        <section className="rounded-md bg-(--color-card) p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-(--color-text)">Revenue setup</p>
                    <p className="mt-1 text-sm text-(--color-text-muted)">Authorize a payment source so the Revenue page can sync product revenue.</p>
                </div>
                <StatusBadge label={connected ? 'Connected' : needsAttention ? 'Needs attention' : 'Ready to connect'} strong={connected} />
            </div>
            <div className="mt-5 rounded-md border border-(--color-border) bg-(--color-bg) p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-(--color-text)">Stripe</p>
                        <p className="mt-1 text-sm text-(--color-text-muted)">
                            {connected ? 'Stripe is authorized. Revenue numbers live on the Revenue page.' : 'Connect Stripe to allow revenue sync for this launched product.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onConnectStripe}
                        disabled={saving || connected}
                        className="rounded-md border border-(--color-border) px-4 py-2 text-sm font-medium text-(--color-text) transition-colors hover:bg-(--color-card) disabled:opacity-40"
                    >
                        {saving ? 'Opening Stripe...' : connected ? 'Connected' : 'Connect Stripe'}
                    </button>
                </div>
            </div>
        </section>
    )
}

function ErrorsSetupPanel() {
    return (
        <section className="rounded-md bg-(--color-card) p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-(--color-text)">Errors setup</p>
                    <p className="mt-1 text-sm text-(--color-text-muted)">First-party error collection for the Errors page.</p>
                </div>
                <StatusBadge label="Automatic" />
            </div>
            <div className="mt-5 rounded-md border border-(--color-border) bg-(--color-bg) p-4">
                <p className="text-sm font-medium text-(--color-text)">No extra install needed</p>
                <p className="mt-1 text-sm text-(--color-text-muted)">The usage snippet also captures uncaught errors and unhandled promise rejections automatically, grouping them into issues on the Errors page. Add a <code>data-release</code> attribute to the snippet tag to tag errors by version.</p>
            </div>
        </section>
    )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-(--color-success)' : 'bg-(--color-border)'}`}
        >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-(--color-surface-raised) shadow-[var(--shadow-sm)] transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    )
}

function AlertRow({
    title,
    description,
    enabled,
    onToggle,
    children,
}: {
    title: string
    description: string
    enabled: boolean
    onToggle: (next: boolean) => void
    children?: React.ReactNode
}) {
    return (
        <div className="rounded-md border border-(--color-border) bg-(--color-bg) p-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-medium text-(--color-text)">{title}</p>
                    <p className="mt-1 text-sm text-(--color-text-muted)">{description}</p>
                </div>
                <Toggle checked={enabled} onChange={onToggle} />
            </div>
            {enabled && children && <div className="mt-3">{children}</div>}
        </div>
    )
}

function ThresholdInput({ label, value, onChange, suffix, step = 1, min = 1 }: { label: string; value: number; onChange: (next: number) => void; suffix: string; step?: number; min?: number }) {
    return (
        <label className="flex items-center gap-2 text-sm text-(--color-text-muted)">
            {label}
            <input
                type="number"
                value={value}
                min={min}
                step={step}
                onChange={event => onChange(Number(event.target.value))}
                className="w-20 rounded-md border border-(--color-border) bg-(--color-card) px-2 py-1 text-sm text-(--color-text) outline-none focus:ring-2 focus:ring-(--color-text)"
            />
            {suffix}
        </label>
    )
}

function AlertsSetupPanel({
    settings,
    saving,
    onSave,
}: {
    settings: AlertSettings | null
    saving: boolean
    onSave: (next: AlertSettings) => void
}) {
    // Sync local draft when the loaded settings change, using React's
    // adjust-state-during-render pattern (no effect needed).
    const [draft, setDraft] = useState<AlertSettings | null>(settings)
    const [syncedFrom, setSyncedFrom] = useState(settings)
    if (settings !== syncedFrom) {
        setSyncedFrom(settings)
        setDraft(settings)
    }

    if (!draft) {
        return (
            <section className="rounded-md bg-(--color-card) p-5">
                <p className="text-sm text-(--color-text-muted)">Loading alert settings…</p>
            </section>
        )
    }

    const update = (patch: Partial<AlertSettings>) => setDraft({ ...draft, ...patch })

    return (
        <section className="rounded-md bg-(--color-card) p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-(--color-text)">Alert preferences</p>
                    <p className="mt-1 text-sm text-(--color-text-muted)">Choose which alerts email you and how sensitive they are. Alerts go to your account email.</p>
                </div>
                <StatusBadge label="Emails the owner" />
            </div>

            <div className="mt-5 flex flex-col gap-3">
                <AlertRow
                    title="New error issue"
                    description="Email when a new error group first appears."
                    enabled={draft.newIssueEnabled}
                    onToggle={next => update({ newIssueEnabled: next })}
                />
                <AlertRow
                    title="Error spike"
                    description="Email when today's errors jump above the recent daily average."
                    enabled={draft.errorSpikeEnabled}
                    onToggle={next => update({ errorSpikeEnabled: next })}
                >
                    <ThresholdInput
                        label="Trigger at"
                        value={draft.errorSpikeMultiplier}
                        onChange={next => update({ errorSpikeMultiplier: next })}
                        suffix="× the average"
                        step={0.5}
                        min={1}
                    />
                </AlertRow>
                <AlertRow
                    title="Signups drop"
                    description="Email when signups fall sharply week-over-week."
                    enabled={draft.signupsDropEnabled}
                    onToggle={next => update({ signupsDropEnabled: next })}
                >
                    <ThresholdInput
                        label="Trigger at a drop of"
                        value={Math.round(draft.signupsDropPct * 100)}
                        onChange={next => update({ signupsDropPct: next / 100 })}
                        suffix="% or more"
                        step={5}
                        min={5}
                    />
                </AlertRow>
                <AlertRow
                    title="Revenue drop"
                    description="Email when MRR falls versus the previous sync."
                    enabled={draft.revenueDropEnabled}
                    onToggle={next => update({ revenueDropEnabled: next })}
                >
                    <ThresholdInput
                        label="Trigger at a drop of"
                        value={Math.round(draft.revenueDropPct * 100)}
                        onChange={next => update({ revenueDropPct: next / 100 })}
                        suffix="% or more"
                        step={5}
                        min={5}
                    />
                </AlertRow>
            </div>

            <div className="mt-5 flex justify-end">
                <button
                    type="button"
                    onClick={() => onSave(draft)}
                    disabled={saving}
                    className="rounded-md bg-(--color-button) px-4 py-2 text-sm font-medium text-(--color-on-button) transition-colors hover:bg-(--color-button-hover) disabled:opacity-40"
                >
                    {saving ? 'Saving…' : 'Save alert settings'}
                </button>
            </div>
        </section>
    )
}

export default function MonitorSetupDashboard() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const queryPipelineId = searchParams.get('pipelineId')
    const { selectedPipelineId, setSelectedPipelineId, hydrated } = useWorkspace()
    const [products, setProducts] = useState<PipelineCard[]>([])
    const [pipelineId, setPipelineId] = useState<string | null>(queryPipelineId)
    const [product, setProduct] = useState<PortfolioProduct | null>(null)
    const [usage, setUsage] = useState<UsageMetrics | null>(null)
    const [revenue, setRevenue] = useState<RevenueMetrics | null>(null)
    const [alertSettings, setAlertSettings] = useState<AlertSettings | null>(null)
    const [savingAlerts, setSavingAlerts] = useState(false)
    const [origin, setOrigin] = useState('')
    const [loadingProducts, setLoadingProducts] = useState(true)
    const [loadingProduct, setLoadingProduct] = useState(false)
    const [savingUsage, setSavingUsage] = useState(false)
    const [savingSetup, setSavingSetup] = useState(false)
    const [savingRevenue, setSavingRevenue] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [activeTask, setActiveTask] = useState<SetupTask>('usage')
    const { plan } = usePlan()
    const isAdmin = plan === 'admin'
    const [showAddProduct, setShowAddProduct] = useState(false)
    const [addName, setAddName] = useState('')
    const [addUrl, setAddUrl] = useState('')
    const [addingProduct, setAddingProduct] = useState(false)

    useEffect(() => {
        setOrigin(window.location.origin)
    }, [])

    useEffect(() => {
        let active = true
        void (async () => {
            try {
                const json = await fetchJson<{ data: PipelineCard[] }>('/api/portfolio')
                if (!active) return
                const data = json?.data ?? []
                setProducts(data)
                setError(null)
                if (!pipelineId && data.length > 0) {
                    const remembered = hydrated ? selectedPipelineId : null
                    const nextId = data.some(item => item.id === remembered) ? remembered : data[0].id
                    setPipelineId(nextId)
                }
            } catch (err) {
                if (active) setError(err instanceof Error ? err.message : 'Something went wrong loading setup.')
            } finally {
                if (active) setLoadingProducts(false)
            }
        })()
        return () => {
            active = false
        }
    }, [hydrated, pipelineId, selectedPipelineId])

    async function loadProduct(id: string) {
        setLoadingProduct(true)
        setError(null)
        try {
            const [productJson, usageJson, revenueJson, alertsJson] = await Promise.all([
                requestJson<ApiData<PortfolioProduct>>(`/api/portfolio/${id}`),
                requestJson<ApiData<UsageMetrics>>(`/api/monitor/${id}/usage`),
                requestJson<ApiData<RevenueMetrics>>(`/api/portfolio/${id}/revenue`),
                requestJson<ApiData<AlertSettings>>(`/api/monitor/${id}/alert-settings`),
            ])
            setProduct(productJson.data)
            setUsage(usageJson.data)
            setRevenue(revenueJson.data)
            setAlertSettings(alertsJson.data)
        } catch (err) {
            setProduct(null)
            setUsage(null)
            setRevenue(null)
            setAlertSettings(null)
            setError(err instanceof Error ? err.message : 'Could not load setup')
        } finally {
            setLoadingProduct(false)
        }
    }

    useEffect(() => {
        if (pipelineId) {
            setSelectedPipelineId(pipelineId)
            void loadProduct(pipelineId)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pipelineId])

    useEffect(() => {
        if (queryPipelineId && queryPipelineId !== pipelineId) setPipelineId(queryPipelineId)
    }, [pipelineId, queryPipelineId])

    function handleProductChange(id: string) {
        setPipelineId(id)
        const params = new URLSearchParams(searchParams.toString())
        params.set('pipelineId', id)
        router.replace(`${routes.core.monitorSetup}?${params.toString()}`)
    }

    async function createMonitoredProduct() {
        const name = addName.trim()
        const productUrl = addUrl.trim()
        if (!name || !productUrl) return
        setAddingProduct(true)
        setError(null)
        try {
            const json = await requestJson<ApiData<PortfolioProduct>>('/api/portfolio/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, product_url: productUrl }),
            })
            const created = json.data
            setProducts(prev => [created, ...prev.filter(item => item.id !== created.id)])
            setShowAddProduct(false)
            setAddName('')
            setAddUrl('')
            setActiveTask('usage')
            handleProductChange(created.id)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not add product')
        } finally {
            setAddingProduct(false)
        }
    }

    async function enableUsageMonitor() {
        if (!pipelineId) return
        setSavingUsage(true)
        setError(null)
        try {
            await requestJson<ApiData<UsageSource>>(`/api/monitor/${pipelineId}/usage-source`, { method: 'POST' })
            await loadProduct(pipelineId)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not enable usage monitor')
        } finally {
            setSavingUsage(false)
        }
    }

    async function saveUsageSetup(values: { productUrl: string; allowedDomain: string }) {
        if (!pipelineId) return
        setSavingSetup(true)
        setError(null)
        try {
            await requestJson<ApiData<UsageSource>>(`/api/monitor/${pipelineId}/usage-source`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_url: values.productUrl,
                    allowed_domain: values.allowedDomain,
                }),
            })
            await loadProduct(pipelineId)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save usage setup')
        } finally {
            setSavingSetup(false)
        }
    }

    async function connectStripeRevenue() {
        if (!pipelineId) return
        setSavingRevenue(true)
        setError(null)
        try {
            const json = await requestJson<ApiData<{ url: string }>>(`/api/portfolio/${pipelineId}/revenue-source/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: 'stripe' }),
            })
            window.location.assign(json.data.url)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not connect Stripe')
        } finally {
            setSavingRevenue(false)
        }
    }

    async function saveAlertSettings(next: AlertSettings) {
        if (!pipelineId) return
        setSavingAlerts(true)
        setError(null)
        try {
            const json = await requestJson<ApiData<AlertSettings>>(`/api/monitor/${pipelineId}/alert-settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    new_issue_enabled: next.newIssueEnabled,
                    error_spike_enabled: next.errorSpikeEnabled,
                    signups_drop_enabled: next.signupsDropEnabled,
                    revenue_drop_enabled: next.revenueDropEnabled,
                    error_spike_multiplier: next.errorSpikeMultiplier,
                    signups_drop_pct: next.signupsDropPct,
                    revenue_drop_pct: next.revenueDropPct,
                }),
            })
            setAlertSettings(json.data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save alert settings')
        } finally {
            setSavingAlerts(false)
        }
    }

    const source = usage?.source ?? product?.usageSource ?? null
    return (
        <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto px-6 py-6">
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                {isAdmin && (
                    <button
                        type="button"
                        onClick={() => setShowAddProduct(true)}
                        className="rounded-md bg-(--color-button) px-4 py-2 text-sm font-medium text-(--color-on-button) transition-colors hover:bg-(--color-button-hover)"
                    >
                        Add product
                    </button>
                )}
                {pipelineId && (
                    <Link
                        href={`${routes.core.monitorCommandCenter}?pipelineId=${pipelineId}`}
                        className="rounded-md border border-(--color-border) px-4 py-2 text-sm font-medium text-(--color-text) hover:bg-(--color-card)"
                    >
                        View dashboard
                    </Link>
                )}
            </div>

            {!pipelineId && !loadingProducts && products.length > 0 && (
                <p className="text-sm text-(--color-text-muted)">Select a launched product from the top bar to connect monitoring sources.</p>
            )}

            {error && (
                <div className="rounded-md border border-(--color-error) px-4 py-3 text-sm text-(--color-error)">
                    {error}
                </div>
            )}

            {!loadingProducts && products.length === 0 && (
                <div className="rounded-md bg-(--color-card) p-8">
                    <p className="text-sm font-medium text-(--color-text)">No launched products yet.</p>
                    <p className="mt-1 text-sm text-(--color-text-muted)">Launch a pipeline card before connecting monitoring sources.</p>
                </div>
            )}

            {loadingProduct && <p className="text-sm text-(--color-text-muted)">Loading setup...</p>}

            {!loadingProduct && product && (
                <>
                    <TaskTabs active={activeTask} onChange={setActiveTask} />
                    {activeTask === 'usage' && (
                        <UsageSetupPanel
                            product={product}
                            source={source}
                            origin={origin}
                            saving={savingUsage}
                            savingSetup={savingSetup}
                            onEnable={() => void enableUsageMonitor()}
                            onSaveSetup={saveUsageSetup}
                        />
                    )}
                    {activeTask === 'traffic' && <TrafficSetupPanel source={source} />}
                    {activeTask === 'revenue' && (
                        <RevenueSetupPanel
                            revenue={revenue}
                            saving={savingRevenue}
                            onConnectStripe={() => void connectStripeRevenue()}
                        />
                    )}
                    {activeTask === 'errors' && <ErrorsSetupPanel />}
                    {activeTask === 'alerts' && (
                        <AlertsSetupPanel
                            settings={alertSettings}
                            saving={savingAlerts}
                            onSave={values => void saveAlertSettings(values)}
                        />
                    )}
                </>
            )}

            {isAdmin && showAddProduct && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onClick={() => !addingProduct && setShowAddProduct(false)}
                >
                    <div
                        className="w-full max-w-md rounded-md bg-(--color-card) p-6"
                        onClick={event => event.stopPropagation()}
                    >
                        <p className="text-sm font-semibold text-(--color-text)">Add a product to monitor</p>
                        <p className="mt-1 text-sm text-(--color-text-muted)">Register a launched product directly. We&apos;ll create its usage source so monitoring is live right away.</p>
                        <form
                            onSubmit={event => {
                                event.preventDefault()
                                void createMonitoredProduct()
                            }}
                            className="mt-5 flex flex-col gap-3"
                        >
                            <label className="flex flex-col gap-1 text-xs font-medium text-(--color-text-muted)">
                                Product name
                                <input
                                    value={addName}
                                    onChange={event => setAddName(event.target.value)}
                                    placeholder="My Product"
                                    autoFocus
                                    className="rounded-md border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm font-normal text-(--color-text) outline-none focus:ring-2 focus:ring-(--color-text)"
                                />
                            </label>
                            <label className="flex flex-col gap-1 text-xs font-medium text-(--color-text-muted)">
                                Product URL
                                <input
                                    value={addUrl}
                                    onChange={event => setAddUrl(event.target.value)}
                                    placeholder="https://your-product.com"
                                    className="rounded-md border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm font-normal text-(--color-text) outline-none focus:ring-2 focus:ring-(--color-text)"
                                />
                            </label>
                            <div className="mt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddProduct(false)}
                                    disabled={addingProduct}
                                    className="rounded-md border border-(--color-border) px-4 py-2 text-sm font-medium text-(--color-text) transition-colors hover:bg-(--color-bg) disabled:opacity-40"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={addingProduct || !addName.trim() || !addUrl.trim()}
                                    className="rounded-md bg-(--color-button) px-4 py-2 text-sm font-medium text-(--color-on-button) transition-colors hover:bg-(--color-button-hover) disabled:opacity-40"
                                >
                                    {addingProduct ? 'Adding…' : 'Add product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
