import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SignalCase, SignalConversation } from '../../types'
import SignalConversationScreen from '../SignalConversationScreen'

const caseData: SignalCase = {
    version: 1,
    status: 'ready',
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
        signalStrength: 0.72,
        momentum30d: 0.18,
        freshnessDays: 2,
        evidenceCount: 1,
        authorCount: 1,
        sourceDiversity: 1,
    },
    thesis: null,
    claims: [],
    problemUnits: [{
        id: 'unit-1',
        parentId: null,
        title: 'Inventory entry takes too much effort',
        description: null,
        kind: 'cause',
        audienceIds: [],
        claimIds: [],
        evidenceIds: ['evidence-1'],
        evidenceCount: 1,
        sourceDiversity: 1,
        frequency: 'medium',
        intensity: 'high',
        momentum30d: 0.1,
        confidence: 'high',
        pinned: true,
        rejected: false,
    }],
    audiences: [],
    alternatives: [],
    assumptions: [],
    evidence: [{
        id: 'evidence-1',
        title: 'Manual inventory takes hours',
        excerpt: 'We spend hours entering inventory every week.',
        body: 'We spend hours entering inventory every week.',
        platform: 'reddit',
        community: 'restaurantowners',
        author: 'operator',
        observedAt: '2026-07-20T12:00:00Z',
        score: 10,
        commentCount: 3,
        sourceUrl: 'https://example.com/evidence',
        stance: 'supporting',
        claimIds: [],
        problemUnitIds: ['unit-1'],
        relevanceReason: 'Describes the time cost.',
        pinned: false,
        userNote: null,
    }],
    recommendedFocus: null,
}

const conversation: SignalConversation = {
    id: 'conversation-1',
    title: 'Why tools fail',
    turns: [
        {
            id: 'turn-user',
            role: 'user',
            text: 'Why do existing tools fail?',
            createdAt: '2026-07-23T12:01:00Z',
            citations: [],
            proposal: null,
            insufficientEvidence: false,
        },
        {
            id: 'turn-assistant',
            role: 'assistant',
            text: 'The available evidence points to manual data entry.',
            createdAt: '2026-07-23T12:01:05Z',
            citations: [{ evidenceId: 'evidence-1', label: 'Manual inventory takes hours' }],
            proposal: {
                id: 'proposal-1',
                kind: 'create_problem_unit',
                title: 'Add data-entry burden',
                summary: 'Track manual entry as a cause.',
                evidenceIds: ['evidence-1'],
                status: 'pending',
            },
            insufficientEvidence: false,
        },
    ],
}

function props() {
    return {
        caseData,
        conversation,
        conversations: [{
            id: conversation.id,
            title: conversation.title,
            updatedAt: '2026-07-23T12:01:05Z',
            archived: false,
        }],
        onSubmit: jest.fn(),
        onNewConversation: jest.fn(),
        onSelectConversation: jest.fn(),
        onArchiveConversation: jest.fn(),
        onOpenEvidence: jest.fn(),
        onAcceptProposal: jest.fn(),
        onRejectProposal: jest.fn(),
        onClearContext: jest.fn(),
    }
}

describe('SignalConversationScreen', () => {
    it('opens cited evidence and requires approval for a proposed change', async () => {
        const handlers = props()
        const user = userEvent.setup()
        render(<SignalConversationScreen {...handlers} />)

        await user.click(screen.getByRole('button', { name: /manual inventory takes hours/i }))
        expect(handlers.onOpenEvidence).toHaveBeenCalledWith('evidence-1')

        await user.click(screen.getByRole('button', { name: 'Accept' }))
        expect(handlers.onAcceptProposal).toHaveBeenCalledWith('proposal-1')

        await user.click(screen.getByRole('button', { name: 'Reject' }))
        expect(handlers.onRejectProposal).toHaveBeenCalledWith('proposal-1')
    })

    it('submits a trimmed grounded question', async () => {
        const handlers = props()
        const user = userEvent.setup()
        render(<SignalConversationScreen {...handlers} conversation={null} conversations={[]} />)

        const input = screen.getByRole('textbox', { name: 'Ask Signal' })
        await user.type(input, '  What should I validate first?  ')
        await user.click(screen.getByRole('button', { name: 'Send message' }))

        expect(handlers.onSubmit).toHaveBeenCalledWith('What should I validate first?')
        expect(input).toHaveValue('')
    })

    it('submits on Enter but preserves Shift+Enter for a new line', async () => {
        const handlers = props()
        render(<SignalConversationScreen {...handlers} conversation={null} conversations={[]} />)

        const input = screen.getByRole('textbox', { name: 'Ask Signal' })
        fireEvent.change(input, { target: { value: 'Compare the audiences' } })
        fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
        expect(handlers.onSubmit).not.toHaveBeenCalled()

        fireEvent.keyDown(input, { key: 'Enter' })
        expect(handlers.onSubmit).toHaveBeenCalledWith('Compare the audiences')
    })

    it('shows project context and allows clearing it', async () => {
        const handlers = props()
        const user = userEvent.setup()
        render(
            <SignalConversationScreen
                {...handlers}
                context={{ kind: 'problem_unit', id: 'unit-1', label: 'Inventory entry takes too much effort' }}
            />,
        )

        expect(screen.getByText('Inventory entry takes too much effort')).toBeInTheDocument()
        await user.click(screen.getByRole('button', { name: 'Clear conversation context' }))
        expect(handlers.onClearContext).toHaveBeenCalled()
    })
})
