'use client'

import { AlertTriangle, Check, Clock3, LoaderCircle, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import SignalWorkspaceTabs from './SignalWorkspaceTabs'
import type { SignalAnalysisStatus, SignalCase, SignalWorkspaceView } from './types'

const STATUS: Record<SignalAnalysisStatus, {
    label: string
    className: string
    icon: typeof Check
}> = {
    queued: {
        label: 'Queued',
        className: 'text-(--color-text-muted)',
        icon: Clock3,
    },
    generating: {
        label: 'Analyzing',
        className: 'text-(--color-blue)',
        icon: LoaderCircle,
    },
    ready: {
        label: 'Ready',
        className: 'text-(--color-success)',
        icon: Check,
    },
    stale: {
        label: 'New evidence',
        className: 'text-(--color-warning)',
        icon: RefreshCw,
    },
    insufficient_evidence: {
        label: 'Limited evidence',
        className: 'text-(--color-warning)',
        icon: AlertTriangle,
    },
    failed: {
        label: 'Analysis failed',
        className: 'text-(--color-error)',
        icon: AlertTriangle,
    },
}

function formatAnalyzedAt(value: string | null): string {
    if (!value) return 'Not analyzed yet'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Analysis date unavailable'
    return `Analyzed ${new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date)}`
}

export interface SignalWorkspaceShellProps {
    caseData: SignalCase
    view: SignalWorkspaceView
    refreshing?: boolean
    onViewChange: (view: SignalWorkspaceView) => void
    onRefresh: () => void
    children: ReactNode
}

export default function SignalWorkspaceShell({
    caseData,
    view,
    refreshing = false,
    onViewChange,
    onRefresh,
    children,
}: SignalWorkspaceShellProps) {
    const status = STATUS[caseData.status]
    const StatusIcon = status.icon
    const refreshAvailable = caseData.status === 'stale' || caseData.status === 'failed'

    return (
        <section className="flex h-[calc(100vh-4rem)] min-h-0 min-w-0 flex-1 flex-col bg-(--color-bg)">
            <header className="shrink-0 border-b border-(--color-border) bg-(--color-bg) px-4 pt-4 sm:px-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h1 className="truncate text-lg font-semibold text-(--color-text)">
                            {caseData.project.projectName}
                        </h1>
                        {caseData.project.clusterName && caseData.project.clusterName !== caseData.project.projectName && (
                            <p className="mt-1 truncate text-xs text-(--color-text-muted)">
                                Source cluster: {caseData.project.clusterName}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${status.className}`}>
                            <StatusIcon
                                size={14}
                                className={caseData.status === 'generating' ? 'animate-spin' : ''}
                                aria-hidden
                            />
                            {status.label}
                        </span>
                        <span className="text-xs text-(--color-text-muted)">
                            {formatAnalyzedAt(caseData.project.analyzedAt)}
                        </span>
                        {refreshAvailable && (
                            <button
                                type="button"
                                disabled={refreshing}
                                onClick={onRefresh}
                                className="inline-flex min-h-9 items-center gap-2 rounded-md border border-(--color-border) px-3 py-2 text-xs font-medium text-(--color-text) hover:bg-(--color-surface-tint) disabled:cursor-wait disabled:opacity-50"
                            >
                                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} aria-hidden />
                                {refreshing ? 'Refreshing…' : 'Refresh analysis'}
                            </button>
                        )}
                    </div>
                </div>

                {caseData.progress && (caseData.status === 'queued' || caseData.status === 'generating') && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-(--color-text-muted)" role="status">
                        <LoaderCircle size={14} className="animate-spin text-(--color-accent)" aria-hidden />
                        {caseData.progress.label}
                    </div>
                )}

                <div className="mt-4 -mb-px overflow-x-auto pb-3">
                    <SignalWorkspaceTabs value={view} onChange={onViewChange} />
                </div>
            </header>

            <div
                id={`signal-${view}-panel`}
                role="tabpanel"
                className="flex min-h-0 min-w-0 flex-1 flex-col"
            >
                {children}
            </div>
        </section>
    )
}
