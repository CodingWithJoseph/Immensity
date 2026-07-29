import { fireEvent, render, screen, within } from '@testing-library/react'
import SignalOverviewScreen from '../SignalOverviewScreen'
import type { SignalCase } from '../../types'

const signal: SignalCase = {
    version: 1,
    status: 'ready',
    progress: null,
    safeError: null,
    project: {
        pipelineId: 'pipeline-1',
        projectName: 'Invoice research',
        clusterName: 'Late invoice follow-up',
        sourceFingerprint: 'sources-v1',
        analyzedAt: '2026-07-20T10:00:00Z',
        sourceUpdatedAt: '2026-07-20T09:00:00Z',
    },
    metrics: {
        signalStrength: 0.78,
        momentum30d: 0.21,
        freshnessDays: 2,
        evidenceCount: 18,
        authorCount: 12,
        sourceDiversity: 4,
    },
    thesis: {
        statement: 'Independent consultants lose time and cash-flow predictability when clients pay late.',
        audience: 'Independent consultants',
        context: 'After client work is delivered',
        coreProblem: 'They cannot reliably prompt clients to pay on time.',
        consequence: 'Cash flow becomes unpredictable.',
        workaround: 'Manually send reminder emails.',
        claimIds: ['claim-observed', 'claim-inferred', 'claim-confirmed'],
        confirmed: false,
    },
    claims: [
        {
            id: 'claim-observed',
            text: 'Consultants repeatedly describe sending manual reminders.',
            kind: 'observed',
            confidence: 'high',
            evidenceIds: ['evidence-1'],
            confirmed: false,
            rejected: false,
        },
        {
            id: 'claim-inferred',
            text: 'Late payments may make cash planning difficult.',
            kind: 'inferred',
            confidence: 'medium',
            evidenceIds: ['evidence-1'],
            confirmed: false,
            rejected: false,
        },
        {
            id: 'claim-confirmed',
            text: 'The audience confirmed reminder work is frustrating.',
            kind: 'user_confirmed',
            confidence: 'high',
            evidenceIds: ['evidence-1'],
            confirmed: true,
            rejected: false,
        },
    ],
    problemUnits: [
        {
            id: 'unit-core',
            parentId: null,
            title: 'Clients do not pay predictably',
            description: 'Payment timing varies even after accepted delivery.',
            kind: 'core_problem',
            audienceIds: ['audience-1'],
            claimIds: ['claim-observed'],
            evidenceIds: ['evidence-1'],
            evidenceCount: 9,
            sourceDiversity: 3,
            frequency: 'high',
            intensity: 'medium',
            momentum30d: 0.18,
            confidence: 'high',
            pinned: false,
            rejected: false,
        },
        {
            id: 'unit-child',
            parentId: 'unit-core',
            title: 'Consultants repeatedly chase invoices',
            description: 'Manual follow-up takes attention away from delivery.',
            kind: 'workaround',
            audienceIds: ['audience-1'],
            claimIds: ['claim-inferred'],
            evidenceIds: ['evidence-1'],
            evidenceCount: 6,
            sourceDiversity: 2,
            frequency: 'medium',
            intensity: 'medium',
            momentum30d: -0.04,
            confidence: 'medium',
            pinned: true,
            rejected: false,
        },
    ],
    audiences: [
        {
            id: 'audience-1',
            name: 'Independent consultants',
            description: 'Solo service providers who invoice clients after delivery.',
            kind: 'observed',
            language: ['chasing invoices', 'awkward reminder'],
            communities: ['r/freelance'],
            reachChannels: ['Professional communities'],
            evidenceIds: ['evidence-1'],
            unknowns: ['Whether this differs by project size'],
        },
    ],
    alternatives: [
        {
            id: 'alternative-1',
            name: 'Calendar reminders',
            category: 'manual',
            reasonUsed: 'Already available',
            weakness: 'Still requires repetitive writing',
            evidenceIds: ['evidence-1'],
        },
    ],
    assumptions: [
        {
            ...{ evidenceIds: ['evidence-1'] },
            id: 'assumption-1',
            question: 'Will consultants change their invoicing workflow?',
            whyItMatters: 'A solution must fit how they already bill clients.',
            category: 'behavior',
            evidenceStrength: 'low',
            resolutionEvidence: '',
            problemUnitId: 'unit-core',
            resolved: false,
        },
        {
            ...{ evidenceIds: ['evidence-1'] },
            id: 'assumption-2',
            question: 'Is the problem repeated monthly?',
            whyItMatters: 'Recurrence affects urgency.',
            category: 'problem',
            evidenceStrength: 'high',
            resolutionEvidence: 'Six longitudinal accounts show recurrence.',
            problemUnitId: 'unit-core',
            resolved: true,
        },
    ],
    evidence: [
        {
            id: 'evidence-1',
            title: 'Freelancer describes weekly invoice follow-up',
            excerpt: 'I spend every Friday following up on outstanding invoices.',
            body: null,
            platform: 'Reddit',
            community: 'r/freelance',
            author: 'source-author',
            observedAt: '2026-07-18T10:00:00Z',
            score: 42,
            commentCount: 9,
            sourceUrl: 'https://example.com/evidence',
            stance: 'supporting',
            claimIds: ['claim-observed'],
            problemUnitIds: ['unit-core'],
            relevanceReason: 'Direct description of repeated follow-up.',
            pinned: false,
            userNote: null,
        },
    ],
    recommendedFocus: {
        problemUnitId: 'unit-core',
        title: 'Validate payment follow-up frequency',
        rationale: 'Frequency is the most consequential remaining uncertainty.',
        supported: ['Manual follow-up is repeatedly described.'],
        risky: ['Willingness to adopt a new workflow is unknown.'],
        suggestedValidationStep: 'Interview five consultants about their last three late invoices.',
    },
}

describe('SignalOverviewScreen', () => {
    it('renders the research document, deterministic snapshot, and provenance labels', () => {
        render(<SignalOverviewScreen signal={signal} />)

        expect(screen.getByRole('heading', { name: 'Signal overview' })).toBeInTheDocument()
        expect(screen.getByText('78%')).toBeInTheDocument()
        expect(screen.getByText('+21%')).toBeInTheDocument()
        expect(screen.getByText('18')).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Problem thesis' })).toBeInTheDocument()
        expect(screen.getAllByText('Observed').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Inferred').length).toBeGreaterThan(0)
        expect(screen.getByText('User confirmed')).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Problem anatomy' })).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Audience understanding' })).toBeInTheDocument()
        expect(screen.getByText('“chasing invoices”')).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Alternatives and workarounds' })).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Assumptions and unknowns' })).toBeInTheDocument()
        expect(screen.getByText('1 unresolved · 1 resolved')).toBeInTheDocument()
    })

    it('submits thesis edits and confirmation through explicit callbacks', () => {
        const onEditThesis = jest.fn()
        const onConfirmThesis = jest.fn()
        render(
            <SignalOverviewScreen
                signal={signal}
                onEditThesis={onEditThesis}
                onConfirmThesis={onConfirmThesis}
            />,
        )

        fireEvent.click(screen.getByRole('button', { name: 'Edit thesis' }))
        fireEvent.change(screen.getByLabelText('Thesis statement'), {
            target: { value: 'Consultants cannot predict when completed work will be paid.' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

        expect(onEditThesis).toHaveBeenCalledWith(expect.objectContaining({
            statement: 'Consultants cannot predict when completed work will be paid.',
        }))

        fireEvent.click(screen.getByRole('button', { name: 'Confirm thesis' }))
        expect(onConfirmThesis).toHaveBeenCalledWith(signal.thesis)
    })

    it('opens an accessible unit drawer and routes every unit action to callbacks', () => {
        const callbacks = {
            onEditProblemUnit: jest.fn(),
            onReclassifyProblemUnit: jest.fn(),
            onPinProblemUnit: jest.fn(),
            onRejectProblemUnit: jest.fn(),
            onRequestProblemUnitSplit: jest.fn(),
            onRequestProblemUnitMerge: jest.fn(),
            onOpenEvidence: jest.fn(),
            onValidateProblemUnit: jest.fn(),
        }
        render(<SignalOverviewScreen signal={signal} {...callbacks} />)

        fireEvent.click(screen.getByRole('button', {
            name: 'Open Clients do not pay predictably, Core problem',
        }))
        const dialog = screen.getByRole('dialog', { name: 'Clients do not pay predictably' })

        expect(dialog).toHaveAttribute('aria-modal', 'true')
        expect(within(dialog).getByText('Consultants repeatedly chase invoices')).toBeInTheDocument()
        expect(within(dialog).getByText('Freelancer describes weekly invoice follow-up')).toBeInTheDocument()
        expect(within(dialog).getByText('Independent consultants')).toBeInTheDocument()

        fireEvent.change(within(dialog).getByLabelText('Classification'), {
            target: { value: 'symptom' },
        })
        expect(callbacks.onReclassifyProblemUnit).toHaveBeenCalledWith('unit-core', 'symptom')

        fireEvent.click(within(dialog).getByRole('button', { name: 'Edit problem unit statement' }))
        fireEvent.change(within(dialog).getByRole('textbox', { name: 'Statement' }), {
            target: { value: 'Client payments arrive unpredictably' },
        })
        fireEvent.click(within(dialog).getByRole('button', { name: 'Save statement' }))
        expect(callbacks.onEditProblemUnit).toHaveBeenCalledWith('unit-core', {
            title: 'Client payments arrive unpredictably',
            description: 'Payment timing varies even after accepted delivery.',
        })

        fireEvent.click(within(dialog).getByRole('button', { name: /Freelancer describes weekly invoice follow-up/ }))
        fireEvent.click(within(dialog).getByRole('button', { name: 'Pin' }))
        fireEvent.click(within(dialog).getByRole('button', { name: 'Reject' }))
        fireEvent.click(within(dialog).getByRole('button', { name: 'Request split' }))
        fireEvent.click(within(dialog).getByRole('button', { name: 'Request merge' }))
        fireEvent.click(within(dialog).getByRole('button', { name: 'Validate unit' }))

        expect(callbacks.onOpenEvidence).toHaveBeenCalledWith('evidence-1')
        expect(callbacks.onPinProblemUnit).toHaveBeenCalledWith('unit-core', true)
        expect(callbacks.onRejectProblemUnit).toHaveBeenCalledWith('unit-core', true)
        expect(callbacks.onRequestProblemUnitSplit).toHaveBeenCalledWith('unit-core')
        expect(callbacks.onRequestProblemUnitMerge).toHaveBeenCalledWith('unit-core')
        expect(callbacks.onValidateProblemUnit).toHaveBeenCalledWith('unit-core')
    })

    it('retains available metrics and explains non-ready analysis states', () => {
        const { rerender } = render(
            <SignalOverviewScreen signal={{ ...signal, status: 'queued' }} />,
        )
        expect(screen.getByText('Analysis queued')).toBeInTheDocument()
        expect(screen.getByText('78%')).toBeInTheDocument()

        rerender(
            <SignalOverviewScreen
                signal={{
                    ...signal,
                    status: 'generating',
                    progress: { step: 'mapping_context', label: 'Mapping audience context' },
                }}
            />,
        )
        expect(screen.getByText(/Analysis in progress/)).toBeInTheDocument()
        expect(screen.getByText('78%')).toBeInTheDocument()

        rerender(<SignalOverviewScreen signal={{ ...signal, status: 'stale' }} />)
        expect(screen.getByText('Analysis may be stale')).toBeInTheDocument()

        rerender(<SignalOverviewScreen signal={{ ...signal, status: 'insufficient_evidence', thesis: null }} />)
        expect(screen.getByText('Evidence is not sufficient yet')).toBeInTheDocument()
        expect(screen.getByText('No defensible thesis yet')).toBeInTheDocument()

        rerender(<SignalOverviewScreen signal={{ ...signal, status: 'failed', safeError: 'Evidence citations could not be verified.' }} />)
        expect(screen.getByRole('alert')).toHaveTextContent('Evidence citations could not be verified.')
        expect(screen.getByText('18')).toBeInTheDocument()
    })

    it('starts recommended validation with the focused unit', () => {
        const onValidateProblem = jest.fn()
        render(<SignalOverviewScreen signal={signal} onValidateProblem={onValidateProblem} />)

        fireEvent.click(screen.getByRole('button', { name: /Validate this problem/ }))
        expect(onValidateProblem).toHaveBeenCalledWith('unit-core')
    })
})
