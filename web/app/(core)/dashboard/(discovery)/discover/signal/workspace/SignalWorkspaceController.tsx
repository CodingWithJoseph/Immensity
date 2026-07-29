'use client'

import { LoaderCircle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useWorkspace } from '@/app/(core)/dashboard/contexts/WorkspaceContext'
import {
    askSignal,
    createSignalConversation,
    decideSignalProposal,
    getSignalCase,
    getSignalConversation,
    listSignalConversations,
    refreshSignalCase,
    SignalWorkspaceApiError,
    updateSignalConversation,
    updateSignalOverride,
} from '@/lib/signalWorkspaceApi'
import SignalWorkspace from './SignalWorkspace'
import {
    DEFAULT_SIGNAL_EVIDENCE_FILTERS,
    type EvidenceNavigatorSelection,
    type EvidenceOverviewTarget,
    type SignalEvidenceFilters,
} from './evidence'
import type { SignalConversationContext } from './conversation'
import type { SignalProblemUnitTextUpdate } from './overview'
import type {
    SignalCase,
    SignalConversation,
    SignalConversationSummary,
    SignalEvidenceRecord,
    SignalThesis,
    SignalWorkspaceView,
} from './types'

const POLL_INTERVAL_MS = 2_000

function isView(value: string | null): value is SignalWorkspaceView {
    return value === 'overview' || value === 'evidence' || value === 'conversation'
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Signal could not complete that action.'
}

export default function SignalWorkspaceController() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { selectedPipelineId, hydrated } = useWorkspace()
    const queryPipelineId = searchParams.get('pipelineId')
    const pipelineId = queryPipelineId ?? (hydrated ? selectedPipelineId : null)
    const [view, setView] = useState<SignalWorkspaceView>(
        isView(searchParams.get('view')) ? searchParams.get('view') as SignalWorkspaceView : 'overview',
    )
    const [caseData, setCaseData] = useState<SignalCase | null>(null)
    const [loadedPipelineId, setLoadedPipelineId] = useState<string | null>(null)
    const [failedPipelineId, setFailedPipelineId] = useState<string | null>(null)
    const [loadErrorStatus, setLoadErrorStatus] = useState<number | null>(null)
    const [loadAttempt, setLoadAttempt] = useState(0)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedProblemUnitId, setSelectedProblemUnitId] = useState<string | null>(null)
    const [evidenceFilters, setEvidenceFilters] = useState<SignalEvidenceFilters>(
        DEFAULT_SIGNAL_EVIDENCE_FILTERS,
    )
    const [selectedEvidenceObject, setSelectedEvidenceObject] =
        useState<EvidenceNavigatorSelection | null>(null)
    const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null)
    const [conversations, setConversations] = useState<SignalConversationSummary[]>([])
    const [conversation, setConversation] = useState<SignalConversation | null>(null)
    const [conversationContext, setConversationContext] =
        useState<SignalConversationContext | null>(null)
    const [conversationPending, setConversationPending] = useState(false)
    const [pendingProposalId, setPendingProposalId] = useState<string | null>(null)

    useEffect(() => {
        if (!pipelineId) return
        const controller = new AbortController()
        void getSignalCase(pipelineId, controller.signal)
            .then(signalCase => {
                setCaseData(signalCase)
                setLoadedPipelineId(pipelineId)
                setFailedPipelineId(null)
                setLoadErrorStatus(null)
                setError(null)
            })
            .catch(reason => {
                if ((reason as Error).name !== 'AbortError') {
                    setFailedPipelineId(pipelineId)
                    setLoadErrorStatus(
                        reason instanceof SignalWorkspaceApiError ? reason.status : null,
                    )
                    setError(errorMessage(reason))
                }
            })
        return () => controller.abort()
    }, [loadAttempt, pipelineId])

    useEffect(() => {
        if (
            !pipelineId
            || !caseData
            || (caseData.status !== 'queued' && caseData.status !== 'generating')
        ) return
        const timeout = window.setTimeout(() => {
            void getSignalCase(pipelineId)
                .then(setCaseData)
                .catch(reason => setError(errorMessage(reason)))
        }, POLL_INTERVAL_MS)
        return () => window.clearTimeout(timeout)
    }, [caseData, pipelineId])

    const changeView = useCallback((nextView: SignalWorkspaceView) => {
        setView(nextView)
        const params = new URLSearchParams(searchParams.toString())
        params.set('view', nextView)
        router.replace(`/dashboard/discover/signal?${params.toString()}`, { scroll: false })
    }, [router, searchParams])

    const mutateOverride = useCallback(async (
        objectKind: string,
        objectId: string,
        patch: Record<string, unknown>,
    ) => {
        if (!pipelineId) return
        setError(null)
        try {
            setCaseData(await updateSignalOverride(pipelineId, objectKind, objectId, patch))
        } catch (reason) {
            setError(errorMessage(reason))
        }
    }, [pipelineId])

    const openEvidence = useCallback((evidenceId: string) => {
        setSelectedEvidenceId(evidenceId)
        changeView('evidence')
    }, [changeView])

    const loadConversations = useCallback(async () => {
        if (!pipelineId || !caseData || caseData.version === 0) return
        try {
            setConversations(await listSignalConversations(pipelineId))
        } catch (reason) {
            setError(errorMessage(reason))
        }
    }, [caseData, pipelineId])

    useEffect(() => {
        if (view !== 'conversation' || !pipelineId || !caseData || caseData.version === 0) return
        let active = true
        void listSignalConversations(pipelineId)
            .then(items => {
                if (active) setConversations(items)
            })
            .catch(reason => {
                if (active) setError(errorMessage(reason))
            })
        return () => {
            active = false
        }
    }, [caseData, pipelineId, view])

    const newConversation = useCallback(async (): Promise<SignalConversation | null> => {
        if (!pipelineId) return null
        setError(null)
        try {
            const created = await createSignalConversation(pipelineId)
            setConversation(created)
            await loadConversations()
            return created
        } catch (reason) {
            setError(errorMessage(reason))
            return null
        }
    }, [loadConversations, pipelineId])

    const selectConversation = useCallback(async (conversationId: string) => {
        if (!pipelineId) return
        setConversationPending(true)
        setError(null)
        try {
            setConversation(await getSignalConversation(pipelineId, conversationId))
        } catch (reason) {
            setError(errorMessage(reason))
        } finally {
            setConversationPending(false)
        }
    }, [pipelineId])

    const submitConversation = useCallback(async (message: string) => {
        if (!pipelineId) return
        setConversationPending(true)
        setError(null)
        try {
            const current = conversation ?? await newConversation()
            if (!current) return
            const updated = await askSignal(pipelineId, current.id, message)
            setConversation(updated)
            await loadConversations()
        } catch (reason) {
            setError(errorMessage(reason))
        } finally {
            setConversationPending(false)
        }
    }, [conversation, loadConversations, newConversation, pipelineId])

    const archiveConversation = useCallback(async (conversationId: string) => {
        if (!pipelineId) return
        try {
            await updateSignalConversation(pipelineId, conversationId, { archived: true })
            if (conversation?.id === conversationId) setConversation(null)
            await loadConversations()
        } catch (reason) {
            setError(errorMessage(reason))
        }
    }, [conversation, loadConversations, pipelineId])

    const decideProposal = useCallback(async (
        proposalId: string,
        decision: 'accepted' | 'rejected',
    ) => {
        if (!pipelineId || !conversation) return
        setPendingProposalId(proposalId)
        setError(null)
        try {
            setConversation(await decideSignalProposal(
                pipelineId,
                conversation.id,
                proposalId,
                decision,
            ))
            if (decision === 'accepted') {
                setCaseData(await getSignalCase(pipelineId))
            }
        } catch (reason) {
            setError(errorMessage(reason))
        } finally {
            setPendingProposalId(null)
        }
    }, [conversation, pipelineId])

    const validateProblem = useCallback((problemUnitId: string | null) => {
        const unit = caseData?.problemUnits.find(candidate => candidate.id === problemUnitId)
        setConversationContext({
            kind: problemUnitId ? 'problem_unit' : 'case',
            id: problemUnitId,
            label: unit?.title ?? caseData?.project.projectName ?? 'Opportunity Case',
        })
        changeView('conversation')
    }, [caseData, changeView])

    const overviewProps = useMemo(() => ({
        selectedProblemUnitId,
        onProblemUnitSelect: setSelectedProblemUnitId,
        onEditThesis: (thesis: SignalThesis) => void mutateOverride('thesis', 'thesis', {
            statement: thesis.statement,
            audience: thesis.audience,
            context: thesis.context,
            coreProblem: thesis.coreProblem,
            consequence: thesis.consequence,
            workaround: thesis.workaround,
        }),
        onConfirmThesis: () => void mutateOverride('thesis', 'thesis', { confirmed: true }),
        onEditProblemUnit: (problemUnitId: string, update: SignalProblemUnitTextUpdate) =>
            void mutateOverride('problem_unit', problemUnitId, {
                title: update.title,
                description: update.description,
            }),
        onPinProblemUnit: (problemUnitId: string, pinned: boolean) =>
            void mutateOverride('problem_unit', problemUnitId, { pinned }),
        onRejectProblemUnit: (problemUnitId: string, rejected: boolean) =>
            void mutateOverride('problem_unit', problemUnitId, { rejected }),
        onOpenEvidence: openEvidence,
        onValidateProblemUnit: validateProblem,
        onValidateProblem: validateProblem,
    }), [mutateOverride, openEvidence, selectedProblemUnitId, validateProblem])

    const evidenceProps = useMemo(() => ({
        filters: evidenceFilters,
        onFiltersChange: setEvidenceFilters,
        selectedObject: selectedEvidenceObject,
        onSelectedObjectChange: setSelectedEvidenceObject,
        selectedEvidenceId,
        onSelectedEvidenceIdChange: setSelectedEvidenceId,
        onOpenOriginalSource: (evidence: SignalEvidenceRecord) => {
            if (evidence.sourceUrl) {
                window.open(evidence.sourceUrl, '_blank', 'noopener,noreferrer')
            }
        },
        onPinChange: (evidence: SignalEvidenceRecord, pinned: boolean) =>
            void mutateOverride('evidence', evidence.id, { pinned }),
        onSaveUserNote: (evidence: SignalEvidenceRecord, userNote: string) =>
            void mutateOverride('evidence', evidence.id, { userNote }),
        onNavigateToOverview: (target: EvidenceOverviewTarget) => {
            if (target.kind === 'problem_unit') setSelectedProblemUnitId(target.id)
            changeView('overview')
        },
    }), [
        changeView,
        evidenceFilters,
        mutateOverride,
        selectedEvidenceId,
        selectedEvidenceObject,
    ])

    const conversationProps = useMemo(() => ({
        conversation,
        conversations,
        context: conversationContext,
        pending: conversationPending,
        pendingProposalId,
        error,
        onSubmit: (message: string) => void submitConversation(message),
        onNewConversation: () => void newConversation(),
        onSelectConversation: (conversationId: string) => void selectConversation(conversationId),
        onArchiveConversation: (conversationId: string) => void archiveConversation(conversationId),
        onOpenEvidence: openEvidence,
        onAcceptProposal: (proposalId: string) => void decideProposal(proposalId, 'accepted'),
        onRejectProposal: (proposalId: string) => void decideProposal(proposalId, 'rejected'),
        onClearContext: () => setConversationContext(null),
    }), [
        archiveConversation,
        conversation,
        conversationContext,
        conversationPending,
        conversations,
        decideProposal,
        error,
        newConversation,
        openEvidence,
        pendingProposalId,
        selectConversation,
        submitConversation,
    ])

    if (!pipelineId) {
        return (
            <div className="grid h-[calc(100vh-4rem)] place-items-center bg-(--color-bg) px-6">
                <p className="text-sm text-(--color-text-muted)">
                    Select a project to inspect its Signal.
                </p>
            </div>
        )
    }

    const loading = pipelineId
        && loadedPipelineId !== pipelineId
        && failedPipelineId !== pipelineId

    if (loading) {
        return (
            <div className="grid h-[calc(100vh-4rem)] place-items-center bg-(--color-bg)">
                <div className="flex items-center gap-2 text-sm text-(--color-text-muted)" role="status">
                    <LoaderCircle size={16} className="animate-spin" aria-hidden />
                    Loading Signal workspace
                </div>
            </div>
        )
    }

    if (!caseData || loadedPipelineId !== pipelineId) {
        return (
            <div className="grid h-[calc(100vh-4rem)] place-items-center bg-(--color-bg) px-6">
                <div className="max-w-md text-center">
                    <p className="text-sm font-medium text-(--color-text)">
                        Signal data unavailable
                    </p>
                    <p className="mt-2 text-xs text-(--color-text-muted)" role="alert">
                        {loadErrorStatus === 404
                            ? 'No signal has been published for this opportunity yet.'
                            : `The signal API could not be reached${loadErrorStatus ? ` (returned ${loadErrorStatus})` : ''}. ${error ?? 'Try again in a moment.'}`}
                    </p>
                    <button
                        type="button"
                        className="mt-4 min-h-9 rounded-md border border-(--color-border) px-3 py-2 text-xs font-medium text-(--color-text) hover:bg-(--color-surface-tint)"
                        onClick={() => {
                            setError(null)
                            setFailedPipelineId(null)
                            setLoadAttempt(current => current + 1)
                        }}
                    >
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="relative flex min-h-0 min-w-0 flex-1">
            {error && view !== 'conversation' && (
                <div
                    role="alert"
                    className="absolute left-1/2 top-3 z-30 max-w-lg -translate-x-1/2 rounded-md border border-(--color-error) bg-(--color-error-soft) px-4 py-2 text-xs text-(--color-error)"
                >
                    {error}
                </div>
            )}
            <SignalWorkspace
                caseData={caseData}
                view={view}
                refreshing={refreshing}
                onViewChange={changeView}
                onRefresh={() => {
                    setRefreshing(true)
                    setError(null)
                    void refreshSignalCase(pipelineId)
                        .then(setCaseData)
                        .catch(reason => setError(errorMessage(reason)))
                        .finally(() => setRefreshing(false))
                }}
                overview={overviewProps}
                evidence={evidenceProps}
                conversation={conversationProps}
            />
        </div>
    )
}
