import { render, screen } from '@testing-library/react'
import SignalWorkspace from '../SignalWorkspace'
import { DEFAULT_SIGNAL_EVIDENCE_FILTERS } from '../evidence'
import type { SignalCase, SignalWorkspaceView } from '../types'

const caseData: SignalCase = {
    version: 1,
    status: 'insufficient_evidence',
    progress: null,
    safeError: null,
    project: {
        pipelineId: 'pipeline-1',
        projectName: 'Restaurant inventory',
        clusterName: 'Inventory uncertainty',
        sourceFingerprint: 'fingerprint',
        analyzedAt: '2026-07-23T12:00:00Z',
        sourceUpdatedAt: '2026-07-23T12:00:00Z',
    },
    metrics: {
        signalStrength: null,
        momentum30d: null,
        freshnessDays: null,
        evidenceCount: 0,
        authorCount: null,
        sourceDiversity: null,
    },
    thesis: null,
    claims: [],
    problemUnits: [],
    audiences: [],
    alternatives: [],
    assumptions: [],
    evidence: [],
    recommendedFocus: null,
}

function renderWorkspace(view: SignalWorkspaceView) {
    return render(
        <SignalWorkspace
            caseData={caseData}
            view={view}
            onViewChange={jest.fn()}
            onRefresh={jest.fn()}
            overview={{}}
            evidence={{
                filters: DEFAULT_SIGNAL_EVIDENCE_FILTERS,
                onFiltersChange: jest.fn(),
                selectedObject: null,
                onSelectedObjectChange: jest.fn(),
                selectedEvidenceId: null,
                onSelectedEvidenceIdChange: jest.fn(),
            }}
            conversation={{
                conversation: null,
                conversations: [],
                onSubmit: jest.fn(),
                onNewConversation: jest.fn(),
                onSelectConversation: jest.fn(),
                onArchiveConversation: jest.fn(),
                onOpenEvidence: jest.fn(),
                onAcceptProposal: jest.fn(),
                onRejectProposal: jest.fn(),
                onClearContext: jest.fn(),
            }}
        />,
    )
}

describe('SignalWorkspace', () => {
    it('composes the Overview screen inside the shared workspace', () => {
        renderWorkspace('overview')
        expect(screen.getByRole('heading', { name: 'Signal overview' })).toBeInTheDocument()
        expect(screen.getByText('Limited evidence')).toBeInTheDocument()
    })

    it('composes the Evidence screen inside the shared workspace', () => {
        renderWorkspace('evidence')
        expect(screen.getByText('0 of 0 evidence records')).toBeInTheDocument()
        expect(screen.getByText('Not enough evidence yet')).toBeInTheDocument()
    })

    it('composes the grounded conversation screen inside the shared workspace', () => {
        renderWorkspace('conversation')
        expect(screen.getByRole('textbox', { name: 'Ask Signal' })).toBeDisabled()
        expect(screen.getByRole('button', { name: 'New conversation' })).toBeInTheDocument()
    })
})
