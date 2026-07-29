'use client'

import { useEffect, useRef, useState } from 'react'
import { useDialogFocus } from '@/app/(core)/dashboard/hooks/useDialogFocus'
import Link from 'next/link'
import { CircleAlert, CircleCheck, ChevronDown, TrendingDown, TrendingUp, X } from 'lucide-react'
import { auth } from '@/lib/firebase'
import type { PipelineCard } from '@/lib/types/cluster'
import type { Issue } from '@/lib/types/issue'
import type { ErrorMetrics, RevenueMetrics, UsageMetrics } from '@/app/(core)/dashboard/(monitor)/monitor/types'
import { routes } from '@/app/util/routes'
import { fetchJson } from '@/lib/fetchJson'
import { timelineProgress } from '@/lib/timeline'
import { isFeatureEnabled } from '@/lib/features'
import {
    dayDistance,
    daysSince,
    formatDate,
    formatRelativeUpdate,
    lifecycleStage,
    projectReadiness,
    type PipelineLifecycleStage,
    type ReadinessTask,
} from '@/lib/pipelineLifecycle'
import StatusChip, { type StatusChipStatus } from '@/app/(core)/dashboard/components/StatusChip'
import SemanticChip from '@/app/(core)/dashboard/components/SemanticChip'
import { ISSUE_CHIPS, issueCountChip, killCriteriaCountChip } from '@/app/(core)/dashboard/components/chipSets'
import DetailRow from '@/app/(core)/dashboard/components/DetailRow'
import { ProgressRow } from '@/app/(core)/dashboard/components/ProgressBar'
import UserIdentity from '@/app/(core)/dashboard/components/UserIdentity'
import { Button, ButtonLink } from '@/app/(core)/dashboard/components/Button'
import PipelineSectionHeader from './PipelineSectionHeader'

interface Props {
    card: PipelineCard
    onClose: () => void
    onLaunch: (id: string) => void
    onRemove: (id: string) => void
    onUpdate: (id: string, updates: Partial<PipelineCard>) => void
    initialLaunchPrompt?: boolean
}

interface ProblemSummary {
    id: string
}

const drawerGroupClass = 'mt-2 space-y-1'

function formatCount(value: number | null | undefined) {
    return (value ?? 0).toLocaleString()
}

function formatMoney(cents: number | null | undefined) {
    if (cents == null || cents === 0) return '0'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100)
}

function periodChange(values: number[]) {
    if (values.length < 2) return null
    const midpoint = Math.floor(values.length / 2)
    const previous = values.slice(0, midpoint).reduce((sum, value) => sum + value, 0)
    const current = values.slice(midpoint).reduce((sum, value) => sum + value, 0)
    return previous > 0 ? (current - previous) / previous : null
}

function hasProjectScopedConnection(
    connected: boolean | null | undefined,
    source: { pipelineId: string } | null | undefined,
    pipelineId: string,
) {
    return Boolean(connected && source?.pipelineId === pipelineId)
}

function MetricTrend({ value, lowerIsBetter = false }: { value: number | null | undefined; lowerIsBetter?: boolean }) {
    if (value == null) return <span className="justify-self-end text-xs font-medium text-(--color-text-faint)">No prior</span>
    const improving = value === 0 ? null : lowerIsBetter ? value < 0 : value > 0
    const tone = improving == null ? 'text-(--color-text-muted)' : improving ? 'text-(--color-blue)' : 'text-(--color-error)'
    const Icon = value < 0 ? TrendingDown : TrendingUp
    return (
        <span className={`inline-flex items-center justify-self-end gap-1 text-xs font-semibold ${tone}`}>
            <Icon aria-hidden size={11} />
            {Math.abs(value * 100).toFixed(1)}%
        </span>
    )
}

function drawerStatus(value: string | undefined, stage: PipelineLifecycleStage): StatusChipStatus {
    if (stage !== 'launched') return stage
    if (value === 'paused' || value === 'sunsetting' || value === 'retired') return value
    return 'live'
}

function UnderlineSelect({
    value,
    onChange,
    disabled,
    ariaLabel,
    children,
}: {
    value: string
    onChange: (value: string) => void
    disabled?: boolean
    ariaLabel: string
    children: React.ReactNode
}) {
    return (
        <span className="relative inline-flex min-w-44">
            <select
                value={value}
                onChange={event => onChange(event.target.value)}
                disabled={disabled}
                aria-label={ariaLabel}
                className="min-h-8 w-full appearance-none border-0 border-b border-(--color-border) bg-transparent py-1 pl-1 pr-9 text-right text-xs font-medium text-(--color-text) outline-none focus:border-(--color-focus) disabled:opacity-60"
            >
                {children}
            </select>
            <ChevronDown aria-hidden size={15} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-(--color-text-muted)" />
        </span>
    )
}

function ReadinessRow({ label, value, target }: { label: string; value: number; target: number }) {
    return <ProgressRow title={label} current={value} target={target} format="slash" />
}

function IssueSummarySection({
    title,
    emptyText,
    actionLabel,
    actionHref,
    issues,
    loading,
    kind,
}: {
    title: string
    emptyText: string
    actionLabel: string
    actionHref: string
    issues: Issue[]
    loading: boolean
    kind: 'issues' | 'killCriteria'
}) {
    const countDefinition = kind === 'issues' ? issueCountChip(issues.length) : killCriteriaCountChip(issues.length)

    return (
        <section className="flex flex-col gap-2">
            <PipelineSectionHeader
                title={title}
                count={issues.length}
                countDefinition={countDefinition}
                action={(
                    <Link href={actionHref} className="text-xs font-medium text-(--color-link) hover:text-(--color-link-hover)">
                        {actionLabel}
                    </Link>
                )}
            />
            {loading ? (
                <p className="py-3 text-xs text-(--color-text-muted)">Loading...</p>
            ) : issues.length === 0 ? (
                <p className="py-2.5 text-xs text-(--color-text-muted)">{emptyText}</p>
            ) : (
                <div className="space-y-1">
                    {issues.slice(0, 3).map(issue => (
                        <Link
                            key={issue.id}
                            href={`${routes.core.issues}/${issue.id}`}
                            className="flex items-center justify-between gap-3 py-2.5 text-xs transition-colors hover:text-(--color-link-hover)"
                        >
                            {kind === 'issues' ? (
                                <span className="min-w-0 truncate text-(--color-text)">{issue.title}</span>
                            ) : (
                                <span className="flex min-w-0 items-center gap-2">
                                    <SemanticChip definition={ISSUE_CHIPS.open} />
                                    <SemanticChip definition={ISSUE_CHIPS.killCriterion} />
                                    <span className="min-w-0 truncate text-(--color-text)">{issue.title}</span>
                                </span>
                            )}
                            <span className="shrink-0 font-medium text-(--color-link) hover:text-(--color-link-hover)">View</span>
                        </Link>
                    ))}
                </div>
            )}
            {issues.length > 3 && (
                <Link href={actionHref} className="self-end text-xs font-medium text-(--color-link) hover:text-(--color-link-hover)">
                    View all issues &rarr;
                </Link>
            )}
        </section>
    )
}

function ConnectionRow({ label, connected, planned = false }: { label: string; connected: boolean; planned?: boolean }) {
    const text = planned ? 'Planned' : connected ? 'Connected' : 'Not connected'
    const tone = planned ? 'bg-(--color-text-faint)' : connected ? 'bg-(--color-success)' : 'bg-(--color-warning)'
    return (
        <div className="flex items-center justify-between gap-4 py-1.5">
            <span className="text-xs text-(--color-text-muted)">{label}</span>
            <span className="inline-flex items-center gap-2 text-xs text-(--color-text-muted)">
                <span className={`h-2 w-2 rounded-full ${tone}`} />
                {text}
            </span>
        </div>
    )
}

function HealthMetric({ label, children, change, lowerIsBetter = false }: { label: string; children: React.ReactNode; change?: number | null; lowerIsBetter?: boolean }) {
    return (
        <div className="flex min-h-8 items-center justify-between gap-4 py-1.5">
            <span className="text-xs text-(--color-text-muted)">{label}</span>
            <span className="grid w-44 grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-2 text-right">
                <span className="truncate text-xs font-medium tabular-nums text-(--color-text)">{children}</span>
                <MetricTrend value={change} lowerIsBetter={lowerIsBetter} />
            </span>
        </div>
    )
}

function ActionsMenu({
    cardId,
    stage,
    status,
    disabled,
    onLaunch,
    onStatusChange,
    onRemove,
}: {
    cardId: string
    stage: PipelineLifecycleStage
    status?: string
    disabled: boolean
    onLaunch: () => void
    onStatusChange: (status: string) => void
    onRemove: () => void
}) {
    const [open, setOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const isLaunched = stage === 'launched'
    const menuItemClass = 'block w-full rounded-md px-3 py-2 text-left text-sm text-(--color-text-muted) transition-colors hover:bg-(--color-bg) hover:text-(--color-text) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus)'
    const dangerMenuItemClass = 'block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-(--color-error) transition-colors hover:bg-(--color-error-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-error)'

    useEffect(() => {
        function handlePointerDown(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handlePointerDown)
        return () => document.removeEventListener('mousedown', handlePointerDown)
    }, [])

    function run(action: () => void) {
        setOpen(false)
        action()
    }

    return (
        <div className="relative" ref={menuRef}>
            <Button
                onClick={() => setOpen(value => !value)}
                size="sm"
                aria-haspopup="menu"
                aria-expanded={open}
            >
                Actions
                <ChevronDown aria-hidden size={14} className="ml-1.5" />
            </Button>
            {open && (
                <div role="menu" className="absolute bottom-full right-0 z-50 mb-2 min-w-52 rounded-md border border-(--color-border) bg-(--color-card) p-1 shadow-lg">
                    {!isLaunched && (
                        <Link
                            href={`${routes.core.signal}?pipelineId=${cardId}`}
                            role="menuitem"
                            onClick={() => setOpen(false)}
                            className={menuItemClass}
                        >
                            Open in Signal
                        </Link>
                    )}
                    {isLaunched && (
                        <Link
                            href={`${routes.core.monitorCommandCenter}?pipelineId=${cardId}`}
                            role="menuitem"
                            onClick={() => setOpen(false)}
                            className={menuItemClass}
                        >
                            Open in Monitor
                        </Link>
                    )}
                    <Link
                        href={`${routes.core.issues}?pipelineId=${cardId}`}
                        role="menuitem"
                        onClick={() => setOpen(false)}
                        className={menuItemClass}
                    >
                        View issues
                    </Link>
                    {stage === 'building' && (
                        <button type="button" role="menuitem" onClick={() => run(onLaunch)} disabled={disabled} className={menuItemClass}>
                            Mark launched
                        </button>
                    )}
                    {isLaunched && status !== 'paused' && status !== 'retired' && status !== 'sunsetting' && (
                        <button type="button" role="menuitem" onClick={() => run(() => onStatusChange('paused'))} disabled={disabled} className={menuItemClass}>
                            Pause project
                        </button>
                    )}
                    {isLaunched && status === 'paused' && (
                        <button type="button" role="menuitem" onClick={() => run(() => onStatusChange('active'))} disabled={disabled} className={menuItemClass}>
                            Resume project
                        </button>
                    )}
                    {isLaunched && (status === 'retired' || status === 'sunsetting') && (
                        <button type="button" role="menuitem" onClick={() => run(() => onStatusChange('active'))} disabled={disabled} className={menuItemClass}>
                            Reopen product
                        </button>
                    )}
                    <div className="my-1 h-px bg-(--color-border)" />
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => run(onRemove)}
                        disabled={disabled}
                        className={dangerMenuItemClass}
                    >
                        Remove {isLaunched ? 'product' : 'project'}
                    </button>
                </div>
            )}
        </div>
    )
}

export default function PipelineCardPanel({
    card,
    onClose,
    onLaunch,
    onRemove,
    onUpdate,
    initialLaunchPrompt = false,
}: Props) {
    const [launchStep, setLaunchStep] = useState<'idle' | 'confirm'>(initialLaunchPrompt ? 'confirm' : 'idle')
    const [removeStep, setRemoveStep] = useState<'idle' | 'confirm'>('idle')
    const dialogRef = useDialogFocus<HTMLElement>()

    // Close on Escape, matching the Teams details drawer.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [onClose])
    const [productName, setProductName] = useState(card.displayName ?? card.name ?? '')
    const [launching, setLaunching] = useState(false)
    const [removing, setRemoving] = useState(false)
    const [saving, setSaving] = useState(false)
    const [actionError, setActionError] = useState<string | null>(null)
    const [issues, setIssues] = useState<Issue[]>([])
    const [killCriteriaIssues, setKillCriteriaIssues] = useState<Issue[]>([])
    const [problems, setProblems] = useState<ProblemSummary[]>([])
    const [tasks, setTasks] = useState<ReadinessTask[]>([])
    const [detailsLoading, setDetailsLoading] = useState(true)
    const [usage, setUsage] = useState<UsageMetrics | null>(null)
    const [revenue, setRevenue] = useState<RevenueMetrics | null>(null)
    const [errors, setErrors] = useState<ErrorMetrics | null>(null)

    const stage = lifecycleStage(card)
    const isLaunched = stage === 'launched'
    const timeline = card.timelineDays && card.timelineStart
        ? timelineProgress(card.timelineStart, card.timelineDays, card.launchedAt ?? null)
        : null
    const readiness = projectReadiness(problems, tasks, Boolean(timeline?.overdue))
    const currentUser = auth.currentUser
    const ownerName = currentUser?.displayName || currentUser?.email || 'Project owner'
    const panelTitle = card.displayName ?? card.name ?? 'Untitled'

    useEffect(() => {
        let active = true
        void (async () => {
            const issuesOn = isFeatureEnabled('issues')
            const [issueJson, killJson, problemJson, taskJson] = await Promise.all([
                issuesOn ? fetchJson<{ data: Issue[] }>(`/api/issues?pipelineId=${card.id}&status=open&issueType=issue`) : Promise.resolve(null),
                issuesOn ? fetchJson<{ data: Issue[] }>(`/api/issues?pipelineId=${card.id}&status=open&issueType=kill_criteria`) : Promise.resolve(null),
                fetchJson<{ data: ProblemSummary[] }>(`/api/problems?pipeline_id=${card.id}`),
                fetchJson<{ data: ReadinessTask[] }>(`/api/tasks?pipeline_id=${card.id}`),
            ])
            if (!active) return
            setIssues(issueJson?.data ?? [])
            setKillCriteriaIssues(killJson?.data ?? [])
            setProblems(problemJson?.data ?? [])
            setTasks(taskJson?.data ?? [])
            setDetailsLoading(false)
        })()
        return () => { active = false }
    }, [card.id])

    useEffect(() => {
        if (!isLaunched || !isFeatureEnabled('monitor')) return
        let active = true
        void (async () => {
            const [usageJson, revenueJson, errorJson] = await Promise.all([
                fetchJson<{ data: UsageMetrics }>(`/api/monitor/${card.id}/usage`),
                fetchJson<{ data: RevenueMetrics }>(`/api/portfolio/${card.id}/revenue`),
                fetchJson<{ data: ErrorMetrics }>(`/api/monitor/${card.id}/errors`),
            ])
            if (!active) return
            setUsage(usageJson?.data ?? null)
            setRevenue(revenueJson?.data ?? null)
            setErrors(errorJson?.data ?? null)
        })()
        return () => { active = false }
    }, [card.id, isLaunched])

    async function patchCard(body: Record<string, unknown>, fallback: Partial<PipelineCard>) {
        setSaving(true)
        setActionError(null)
        try {
            const res = await fetch(`/api/pipeline/${card.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json?.detail || json?.error || 'Update failed')
            onUpdate(card.id, { ...fallback, ...(json?.data ?? {}) })
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Update failed')
        } finally {
            setSaving(false)
        }
    }

    async function handleTimelineChange(value: string) {
        if (!value) return
        await patchCard({ timeline_days: Number(value) }, { timelineDays: Number(value) })
    }

    async function handleStatusChange(status: string) {
        await patchCard({ status }, { status })
    }

    async function handleRemove() {
        setRemoving(true)
        const res = await fetch(`/api/pipeline/${card.id}`, { method: 'DELETE' })
        setRemoving(false)
        if (!res.ok) {
            setActionError('Could not remove this project.')
            return
        }
        onRemove(card.id)
        onClose()
    }

    async function handleLaunch() {
        setLaunching(true)
        setActionError(null)
        const res = await fetch(`/api/pipeline/${card.id}/launch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_name: productName.trim() || 'Untitled Product' }),
        })
        const json = await res.json()
        setLaunching(false)
        if (!res.ok) {
            setActionError(json?.detail || json?.error || 'Could not launch this project.')
            return
        }
        onUpdate(card.id, json?.data ?? { name: productName, displayName: productName })
        onLaunch(card.id)
        setLaunchStep('idle')
    }

    const projectedDays = dayDistance(card.timelineTargetLaunch)
    const launchedDays = daysSince(card.launchedAt)
    const issuesHref = `${routes.core.issues}?pipelineId=${card.id}&issueType=issue`
    const killHref = `${routes.core.issues}?pipelineId=${card.id}&issueType=kill_criteria`
    const usageConnected = hasProjectScopedConnection(usage?.connected, usage?.source, card.id)
    const revenueConnected = hasProjectScopedConnection(revenue?.connected, revenue?.source, card.id)
    const errorsConnected = hasProjectScopedConnection(errors?.connected, errors?.source, card.id)
    const scopedUsage = usageConnected ? usage : null
    const scopedRevenue = revenueConnected ? revenue : null
    const scopedErrors = errorsConnected ? errors : null
    const healthState = card.status === 'retired'
        ? 'Retired'
        : card.status === 'sunsetting'
            ? 'Sunsetting'
            : scopedUsage?.health?.label || 'No data'
    const healthTone = card.status === 'retired'
        ? 'text-(--color-text-muted)'
        : card.status === 'sunsetting' || !usageConnected || scopedUsage?.health?.state === 'warning' || scopedUsage?.health?.state === 'no-data'
            ? 'text-(--color-warning)'
            : scopedUsage?.health?.state === 'unhealthy'
                ? 'text-(--color-error)'
                : 'text-(--color-success)'
    const healthIsHealthy = healthState === 'Healthy'
    const trafficTrend = scopedUsage?.growth?.visitors.changePct ?? periodChange((scopedUsage?.daily ?? []).map(point => point.visitors))
    const revenueTrend = scopedRevenue?.metrics?.ratios.mrrGrowthRate ?? null
    const errorsTrend = periodChange((scopedErrors?.daily ?? []).map(point => point.errors))
    const usersTrend = scopedUsage?.growth?.visitors.changePct ?? null

    return (
        <div className="pf-fade-in fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
            <aside ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1} onClick={event => event.stopPropagation()} className="flex h-screen w-[min(680px,100vw)] flex-col border-l border-(--color-border) bg-(--color-card) shadow-xl outline-none" aria-label={`${panelTitle} details`}>
                <header className="flex shrink-0 items-start justify-between border-b border-(--color-border) px-6 py-4 sm:px-8">
                    <div className="min-w-0 flex-1 pr-4">
                        <h2 className="truncate text-lg font-semibold text-(--color-text)">{panelTitle}</h2>
                        {card.notes && <p className="mt-1 line-clamp-2 text-sm text-(--color-text-muted)">{card.notes}</p>}
                        <p className="mt-1 text-xs text-(--color-text-faint)">Added {formatDate(card.createdAt)}</p>
                    </div>
                    <Button onClick={onClose} size="sm" className="h-9 w-9 min-h-0 shrink-0 border-(--color-border) p-0 text-(--color-text-muted) hover:border-(--color-error) hover:bg-(--color-error-soft) hover:text-(--color-error)" aria-label="Close panel">
                        <X size={18} aria-hidden />
                    </Button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto">
                    <div className="flex flex-col divide-y divide-(--color-border) px-6 py-4 sm:px-8 [&>section]:py-4 [&>section:first-child]:pt-0 [&>section:last-child]:pb-0">
                        <section>
                            <PipelineSectionHeader title="Overview" />
                            <div className={drawerGroupClass}>
                                <DetailRow label="Status"><StatusChip status={drawerStatus(card.status, stage)} semantic /></DetailRow>
                                {isLaunched ? (
                                    <>
                                        <DetailRow label="Launched">{formatDate(card.launchedAt)}</DetailRow>
                                        <DetailRow label="Days since launch">{launchedDays == null ? 'Not recorded' : `${launchedDays} days`}</DetailRow>
                                    </>
                                ) : (
                                    <>
                                        <DetailRow label="Projected launch">{formatDate(card.timelineTargetLaunch)}</DetailRow>
                                        <DetailRow label="Days until launch">
                                            {projectedDays == null ? 'Not set' : projectedDays < 0 ? `${Math.abs(projectedDays)} days overdue` : projectedDays === 0 ? 'Today' : `${projectedDays} days`}
                                        </DetailRow>
                                        <DetailRow label="Launch window">
                                            <UnderlineSelect value={card.timelineDays ? String(card.timelineDays) : ''} onChange={handleTimelineChange} disabled={saving} ariaLabel="Projected launch window">
                                                <option value="">Set launch window</option>
                                                <option value="14">2 weeks</option>
                                                <option value="30">30 days</option>
                                                <option value="60">60 days</option>
                                                <option value="90">90 days</option>
                                            </UnderlineSelect>
                                        </DetailRow>
                                        {timeline && (
                                            <DetailRow label="Timeline progress">
                                                <span>{Math.round(timeline.percent)}% elapsed</span>
                                            </DetailRow>
                                        )}
                                    </>
                                )}
                                <DetailRow label="Last updated">{formatRelativeUpdate(card.updatedAt ?? card.createdAt)}</DetailRow>
                                <DetailRow label="Owner"><UserIdentity name={ownerName} photoUrl={currentUser?.photoURL} /></DetailRow>
                                <DetailRow label="Team"><UserIdentity name={card.team?.name || 'No team assigned'} kind="team" /></DetailRow>
                            </div>
                        </section>

                        {!isLaunched && (
                            <section>
                                <PipelineSectionHeader title="Readiness" />
                                <div className={drawerGroupClass}>
                                    <ReadinessRow label="Breakdown verified" value={readiness.verifiedProblems} target={readiness.target} />
                                    <ReadinessRow label="Tasks verified" value={readiness.verifiedTasks} target={readiness.target} />
                                </div>
                            </section>
                        )}

                        {isLaunched && isFeatureEnabled('monitor') && (
                            <>
                                <section>
                                    <PipelineSectionHeader title="Monitoring setup" />
                                    <div className={drawerGroupClass}>
                                        <ConnectionRow label="Usage" connected={usageConnected} />
                                        <ConnectionRow label="Revenue" connected={revenueConnected} />
                                        <ConnectionRow label="Errors" connected={errorsConnected} />
                                        <ConnectionRow label="Market tracking" connected={false} planned />
                                    </div>
                                </section>
                                <section>
                                    <PipelineSectionHeader title="Health summary" />
                                    <div className={drawerGroupClass}>
                                        <div className="flex items-center gap-2 py-1.5">
                                            {healthIsHealthy ? <CircleCheck aria-hidden size={16} className={healthTone} /> : <CircleAlert aria-hidden size={16} className={healthTone} />}
                                            <div className="min-w-0">
                                                <p className={`text-xs font-semibold ${healthTone}`}>{healthState}</p>
                                            </div>
                                        </div>
                                        <HealthMetric label="Traffic" change={trafficTrend}>{scopedUsage ? formatCount(scopedUsage.summary14d.visitors) : 'No data'}</HealthMetric>
                                        <HealthMetric label="Revenue" change={revenueTrend}>{scopedRevenue ? formatMoney(scopedRevenue.summary.mrrCents) : 'No data'}</HealthMetric>
                                        <HealthMetric label="Errors" change={errorsTrend} lowerIsBetter>{scopedErrors ? formatCount(scopedErrors.summary14d.errors) : 'No data'}</HealthMetric>
                                        <HealthMetric label="Users" change={usersTrend}>{scopedUsage ? formatCount(scopedUsage.summary14d.activeUsers) : 'No data'}</HealthMetric>
                                    </div>
                                </section>
                            </>
                        )}

                        {!isLaunched && isFeatureEnabled('issues') && (
                            <IssueSummarySection title="Kill criteria" emptyText="No kill criteria yet." actionLabel="Open Issues" actionHref={killHref} issues={killCriteriaIssues} loading={detailsLoading} kind="killCriteria" />
                        )}
                        {isFeatureEnabled('issues') && (
                            <IssueSummarySection title="Current issues" emptyText="No current issues yet." actionLabel="Open Issues" actionHref={issuesHref} issues={issues} loading={detailsLoading} kind="issues" />
                        )}
                    </div>
                </div>

                <footer className="shrink-0 border-t border-(--color-border) bg-(--color-card) px-6 py-4 sm:px-8">
                    {actionError && <p className="mb-3 text-sm text-(--color-error)">{actionError}</p>}

                    {launchStep === 'confirm' && !isLaunched && (
                        <div className="mb-4 rounded-md border border-(--color-warning) bg-(--color-warning-soft) p-4">
                            <p className="text-sm font-semibold text-(--color-text)">{readiness.verifiedProblems < readiness.target || readiness.verifiedTasks < readiness.target ? 'Launch before the recommended target?' : 'Ready to launch'}</p>
                            <p className="mt-1 text-xs leading-relaxed text-(--color-text-muted)">
                                This project has {readiness.verifiedProblems} verified breakdowns and {readiness.verifiedTasks} verified tasks. The recommended launch target is {readiness.target} of each. You can still launch this project.
                            </p>
                            <input value={productName} onChange={event => setProductName(event.target.value)} aria-label="Product name" className="mt-3 min-h-10 w-full border-b border-(--color-border-strong) bg-transparent px-1 py-2 text-sm text-(--color-text) outline-none focus:border-(--color-focus)" />
                            <div className="mt-3 flex flex-wrap justify-end gap-2">
                                <Button onClick={() => setLaunchStep('idle')}>Continue Building</Button>
                                <Button onClick={() => void handleLaunch()} disabled={launching} variant="primary">{launching ? 'Launching...' : 'Launch Anyway'}</Button>
                            </div>
                        </div>
                    )}

                    {removeStep === 'confirm' && (
                        <div className="mb-4 rounded-md border border-(--color-error) bg-(--color-error-soft) p-4">
                            <p className="text-sm font-semibold text-(--color-error)">Remove this {isLaunched ? 'product' : 'project'}?</p>
                            <p className="mt-1 text-xs text-(--color-text-muted)">This removes it from active views while keeping its source data available.</p>
                            <div className="mt-3 flex justify-end gap-2">
                                <Button onClick={() => setRemoveStep('idle')}>Cancel</Button>
                                <Button onClick={() => void handleRemove()} disabled={removing} variant="danger">{removing ? 'Removing...' : 'Remove'}</Button>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-2">
                        <ActionsMenu
                            cardId={card.id}
                            stage={stage}
                            status={card.status}
                            disabled={saving || launching || removing}
                            onLaunch={() => setLaunchStep('confirm')}
                            onStatusChange={status => void handleStatusChange(status)}
                            onRemove={() => setRemoveStep('confirm')}
                        />
                        {stage === 'building' && <ButtonLink href={`${routes.core.tasks}?pipelineId=${card.id}`} variant="primary" size="sm">Continue Building</ButtonLink>}
                    </div>
                </footer>
            </aside>
        </div>
    )
}
