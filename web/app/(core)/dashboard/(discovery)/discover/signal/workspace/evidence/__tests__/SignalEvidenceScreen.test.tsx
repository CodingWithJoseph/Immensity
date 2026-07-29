import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import type { SignalCase, SignalEvidenceRecord } from '../../types'
import EvidenceDetailDrawer from '../EvidenceDetailDrawer'
import SignalEvidenceScreen, {
    DEFAULT_SIGNAL_EVIDENCE_FILTERS,
    type EvidenceNavigatorSelection,
    type SignalEvidenceFilters,
} from '../SignalEvidenceScreen'

const SUPPORTING: SignalEvidenceRecord = {
    id: 'evidence-supporting',
    title: 'Teams lose hours reconciling research notes',
    excerpt: 'We spend most Fridays reconciling customer notes across three different tools.',
    body: 'Our research team spends most Fridays reconciling customer notes across three different tools. The handoff is entirely manual.',
    platform: 'Reddit',
    community: 'r/userresearch',
    author: 'field-notes',
    observedAt: '2026-07-20T12:00:00.000Z',
    score: 84,
    commentCount: 19,
    sourceUrl: 'https://example.com/research-thread',
    stance: 'supporting',
    claimIds: ['claim-hours'],
    problemUnitIds: ['problem-fragmentation'],
    relevanceReason: 'Describes repeated manual reconciliation in the target workflow.',
    pinned: true,
    userNote: 'Strong workflow evidence.',
}

const CONTRADICTORY: SignalEvidenceRecord = {
    id: 'evidence-contradictory',
    title: 'A single spreadsheet is enough for our team',
    excerpt: 'For a five-person team, our shared spreadsheet has worked without any issues.',
    body: null,
    platform: 'Hacker News',
    community: 'Ask HN',
    author: 'small-team-founder',
    observedAt: '2026-06-10T08:00:00.000Z',
    score: 7,
    commentCount: 2,
    sourceUrl: null,
    stance: 'contradictory',
    claimIds: ['claim-hours'],
    problemUnitIds: [],
    relevanceReason: 'Challenges whether the problem persists for very small teams.',
    pinned: false,
    userNote: null,
}

const CASE: SignalCase = {
    version: 1,
    status: 'ready',
    progress: null,
    safeError: null,
    project: {
        pipelineId: 'pipeline-1',
        projectName: 'Research operations',
        clusterName: 'Fragmented research',
        sourceFingerprint: 'fingerprint',
        analyzedAt: '2026-07-21T00:00:00.000Z',
        sourceUpdatedAt: '2026-07-20T00:00:00.000Z',
    },
    metrics: {
        signalStrength: 0.82,
        momentum30d: 0.18,
        freshnessDays: 1,
        evidenceCount: 2,
        authorCount: 2,
        sourceDiversity: 2,
    },
    thesis: {
        statement: 'Research teams lose time when customer evidence is fragmented.',
        audience: 'Research operations leads',
        context: 'During synthesis and handoff',
        coreProblem: 'Customer evidence is fragmented across tools',
        consequence: 'Teams repeat synthesis work',
        workaround: 'Manual spreadsheets',
        claimIds: ['claim-hours'],
        confirmed: false,
    },
    claims: [{
        id: 'claim-hours',
        text: 'Research teams lose several hours each week reconciling evidence.',
        kind: 'inferred',
        confidence: 'high',
        evidenceIds: [SUPPORTING.id, CONTRADICTORY.id],
        confirmed: false,
        rejected: false,
    }, {
        id: 'claim-handoff',
        text: 'Handoffs fail when evidence has no shared structure.',
        kind: 'observed',
        confidence: 'medium',
        evidenceIds: [],
        confirmed: false,
        rejected: false,
    }],
    problemUnits: [{
        id: 'problem-fragmentation',
        parentId: null,
        title: 'Fragmented evidence',
        description: 'Notes are spread across incompatible tools.',
        kind: 'core_problem',
        audienceIds: ['audience-research-ops'],
        claimIds: ['claim-hours'],
        evidenceIds: [SUPPORTING.id],
        evidenceCount: 1,
        sourceDiversity: 1,
        frequency: 'high',
        intensity: 'medium',
        momentum30d: 0.18,
        confidence: 'high',
        pinned: false,
        rejected: false,
    }],
    audiences: [{
        id: 'audience-research-ops',
        name: 'Research operations leads',
        description: 'People responsible for research systems and handoffs.',
        kind: 'inferred',
        language: ['research repository'],
        communities: ['r/userresearch'],
        reachChannels: ['professional communities'],
        evidenceIds: [SUPPORTING.id],
        unknowns: [],
    }],
    alternatives: [{
        id: 'alternative-spreadsheet',
        name: 'Shared spreadsheets',
        category: 'manual',
        reasonUsed: 'Low cost',
        weakness: 'Manual reconciliation',
        evidenceIds: [CONTRADICTORY.id],
    }],
    assumptions: [{
        id: 'assumption-scale',
        question: 'Does the pain increase with team size?',
        whyItMatters: 'It determines the initial segment.',
        category: 'audience',
        evidenceStrength: 'medium',
        evidenceIds: [SUPPORTING.id],
        resolutionEvidence: 'Compare evidence by team size.',
        problemUnitId: 'problem-fragmentation',
        resolved: false,
    }],
    evidence: [SUPPORTING, CONTRADICTORY],
    recommendedFocus: null,
}

function ControlledScreen({
    signalCase = CASE,
    evidenceRecords,
    onSaveUserNote,
}: {
    signalCase?: SignalCase | null
    evidenceRecords?: SignalEvidenceRecord[]
    onSaveUserNote?: jest.Mock
}) {
    const [filters, setFilters] = useState<SignalEvidenceFilters>(DEFAULT_SIGNAL_EVIDENCE_FILTERS)
    const [selectedObject, setSelectedObject] = useState<EvidenceNavigatorSelection | null>(null)
    const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null)
    return (
        <SignalEvidenceScreen
            signalCase={signalCase}
            evidenceRecords={evidenceRecords}
            filters={filters}
            onFiltersChange={setFilters}
            selectedObject={selectedObject}
            onSelectedObjectChange={setSelectedObject}
            selectedEvidenceId={selectedEvidenceId}
            onSelectedEvidenceIdChange={setSelectedEvidenceId}
            onSaveUserNote={onSaveUserNote}
        />
    )
}

describe('SignalEvidenceScreen', () => {
    it('filters retained evidence through controlled filters', async () => {
        const user = userEvent.setup()
        render(<ControlledScreen />)

        expect(screen.getByText(SUPPORTING.title)).toBeInTheDocument()
        expect(screen.getByText(CONTRADICTORY.title)).toBeInTheDocument()

        await user.selectOptions(screen.getByLabelText('Source'), 'Reddit')
        expect(screen.getByText(SUPPORTING.title)).toBeInTheDocument()
        expect(screen.queryByText(CONTRADICTORY.title)).not.toBeInTheDocument()

        await user.selectOptions(screen.getByLabelText('Community'), 'Ask HN')
        expect(screen.getByText('No evidence matches these filters')).toBeInTheDocument()
    })

    it('opens the source-first detail drawer and saves a local note draft through a callback', async () => {
        const user = userEvent.setup()
        const onSaveUserNote = jest.fn()
        render(<ControlledScreen onSaveUserNote={onSaveUserNote} />)

        await user.click(screen.getByRole('button', { name: `View details for ${SUPPORTING.title}` }))
        const dialog = screen.getByRole('dialog', { name: SUPPORTING.title })

        expect(within(dialog).getByText('Original source')).toBeInTheDocument()
        expect(within(dialog).getByText('AI interpretation')).toBeInTheDocument()
        expect(within(dialog).getByText(SUPPORTING.body!)).toBeInTheDocument()
        expect(within(dialog).getByText(SUPPORTING.relevanceReason!)).toBeInTheDocument()

        const note = within(dialog).getByLabelText('Your note')
        await user.clear(note)
        await user.type(note, 'Validate this with larger teams.')
        await user.click(within(dialog).getByRole('button', { name: 'Save note' }))

        expect(onSaveUserNote).toHaveBeenCalledWith(SUPPORTING, 'Validate this with larger teams.')
    })

    it('keeps retained evidence visible when the generated case is unavailable', () => {
        render(<ControlledScreen signalCase={null} evidenceRecords={[SUPPORTING]} />)

        expect(screen.getByText('Generated case unavailable')).toBeInTheDocument()
        expect(screen.getByText(SUPPORTING.title)).toBeInTheDocument()
        expect(screen.getByText('Case objects are unavailable. Existing evidence remains accessible.')).toBeInTheDocument()
    })

    it('does not apply a stale case-object selection when the generated case is unavailable', () => {
        render(
            <SignalEvidenceScreen
                signalCase={null}
                evidenceRecords={[SUPPORTING]}
                filters={DEFAULT_SIGNAL_EVIDENCE_FILTERS}
                onFiltersChange={jest.fn()}
                selectedObject={{ kind: 'claim', id: 'claim-hours' }}
                onSelectedObjectChange={jest.fn()}
                selectedEvidenceId={null}
                onSelectedEvidenceIdChange={jest.fn()}
            />,
        )

        expect(screen.getByText(SUPPORTING.title)).toBeInTheDocument()
        expect(screen.getByText('1 of 1 evidence records')).toBeInTheDocument()
    })

    it('keeps existing rows visible while a case is generating', () => {
        const generatingCase: SignalCase = {
            ...CASE,
            status: 'generating',
            progress: { step: 'validating_citations', label: 'Validating citations' },
        }
        render(<ControlledScreen signalCase={generatingCase} />)

        expect(screen.getByText('Validating citations')).toBeInTheDocument()
        expect(screen.getByText(SUPPORTING.title)).toBeInTheDocument()
    })

    it('shows the insufficient-evidence state without inventing records', () => {
        const insufficientCase: SignalCase = {
            ...CASE,
            status: 'insufficient_evidence',
            evidence: [],
            metrics: { ...CASE.metrics, evidenceCount: 0 },
        }
        render(<ControlledScreen signalCase={insufficientCase} />)

        expect(screen.getByText('Insufficient evidence')).toBeInTheDocument()
        expect(screen.getByText('Not enough evidence yet')).toBeInTheDocument()
    })
})

describe('EvidenceDetailDrawer accessibility and actions', () => {
    it('uses modal dialog semantics, traps initial focus, and closes on Escape', async () => {
        const user = userEvent.setup()
        const onClose = jest.fn()
        render(
            <EvidenceDetailDrawer
                open
                evidence={SUPPORTING}
                signalCase={CASE}
                onClose={onClose}
            />,
        )

        const dialog = screen.getByRole('dialog', { name: SUPPORTING.title })
        expect(dialog).toHaveAttribute('aria-modal', 'true')
        expect(within(dialog).getByRole('button', { name: 'Close evidence details' })).toHaveFocus()

        await user.keyboard('{Escape}')
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('dispatches attach, pin, stance, and overview actions through callbacks', async () => {
        const user = userEvent.setup()
        const onAttachToClaim = jest.fn()
        const onPinChange = jest.fn()
        const onMarkIrrelevant = jest.fn()
        const onMarkContradictory = jest.fn()
        const onNavigateToOverview = jest.fn()
        render(
            <EvidenceDetailDrawer
                open
                evidence={SUPPORTING}
                signalCase={CASE}
                onClose={jest.fn()}
                onAttachToClaim={onAttachToClaim}
                onPinChange={onPinChange}
                onMarkIrrelevant={onMarkIrrelevant}
                onMarkContradictory={onMarkContradictory}
                onNavigateToOverview={onNavigateToOverview}
            />,
        )

        const dialog = screen.getByRole('dialog')
        await user.selectOptions(within(dialog).getByLabelText('Claim to attach'), 'claim-handoff')
        await user.click(within(dialog).getByRole('button', { name: 'Attach' }))
        await user.click(within(dialog).getByRole('button', { name: 'Unpin' }))
        await user.click(within(dialog).getByRole('button', { name: 'Mark contradictory' }))
        await user.click(within(dialog).getByRole('button', { name: 'Mark irrelevant' }))
        await user.click(within(dialog).getByRole('button', { name: 'Related overview object' }))

        expect(onAttachToClaim).toHaveBeenCalledWith(SUPPORTING, 'claim-handoff')
        expect(onPinChange).toHaveBeenCalledWith(SUPPORTING, false)
        expect(onMarkContradictory).toHaveBeenCalledWith(SUPPORTING)
        expect(onMarkIrrelevant).toHaveBeenCalledWith(SUPPORTING)
        expect(onNavigateToOverview).toHaveBeenCalledWith({
            kind: 'problem_unit',
            id: 'problem-fragmentation',
        })
    })
})
