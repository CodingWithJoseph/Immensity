'use client'

import {
    SignalConversationScreen,
    type SignalConversationScreenProps,
} from './conversation'
import {
    SignalEvidenceScreen,
    type SignalEvidenceScreenProps,
} from './evidence'
import {
    SignalOverviewScreen,
    type SignalOverviewScreenProps,
} from './overview'
import SignalWorkspaceShell from './SignalWorkspaceShell'
import type { SignalCase, SignalWorkspaceView } from './types'

export interface SignalWorkspaceProps {
    caseData: SignalCase
    view: SignalWorkspaceView
    refreshing?: boolean
    onViewChange: (view: SignalWorkspaceView) => void
    onRefresh: () => void
    overview: Omit<SignalOverviewScreenProps, 'signal'>
    evidence: Omit<SignalEvidenceScreenProps, 'signalCase'>
    conversation: Omit<SignalConversationScreenProps, 'caseData'>
}

/**
 * Composes the three Signal screens without owning server state.
 *
 * The route-level controller is intentionally responsible for loading the case,
 * persisting edits, running model actions, and handling errors. Keeping those
 * responsibilities outside the screens lets each view remain independently
 * testable and prevents UI code from inventing backend behavior.
 */
export default function SignalWorkspace({
    caseData,
    view,
    refreshing = false,
    onViewChange,
    onRefresh,
    overview,
    evidence,
    conversation,
}: SignalWorkspaceProps) {
    return (
        <SignalWorkspaceShell
            caseData={caseData}
            view={view}
            refreshing={refreshing}
            onViewChange={onViewChange}
            onRefresh={onRefresh}
        >
            {view === 'overview' && (
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                    <SignalOverviewScreen signal={caseData} {...overview} />
                </div>
            )}

            {view === 'evidence' && (
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                    <SignalEvidenceScreen signalCase={caseData} {...evidence} />
                </div>
            )}

            {view === 'conversation' && (
                <SignalConversationScreen caseData={caseData} {...conversation} />
            )}
        </SignalWorkspaceShell>
    )
}
