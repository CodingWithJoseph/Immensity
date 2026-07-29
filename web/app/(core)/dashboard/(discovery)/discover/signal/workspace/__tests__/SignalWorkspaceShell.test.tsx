import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignalWorkspaceShell from '../SignalWorkspaceShell'
import type { SignalCase } from '../types'

function makeCase(status: SignalCase['status'] = 'ready'): SignalCase {
    return {
        version: 1,
        status,
        progress: status === 'generating'
            ? { step: 'analyzing_problem', label: 'Finding the problem structure' }
            : null,
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
}

describe('SignalWorkspaceShell', () => {
    it('changes workspace views through the shared tabs', async () => {
        const onViewChange = jest.fn()
        const user = userEvent.setup()

        render(
            <SignalWorkspaceShell
                caseData={makeCase()}
                view="overview"
                onViewChange={onViewChange}
                onRefresh={jest.fn()}
            >
                <p>Screen content</p>
            </SignalWorkspaceShell>,
        )

        expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
        await user.click(screen.getByRole('tab', { name: 'Evidence' }))
        expect(onViewChange).toHaveBeenCalledWith('evidence')
    })

    it('offers a refresh when new source evidence makes the case stale', async () => {
        const onRefresh = jest.fn()
        const user = userEvent.setup()

        render(
            <SignalWorkspaceShell
                caseData={makeCase('stale')}
                view="overview"
                onViewChange={jest.fn()}
                onRefresh={onRefresh}
            >
                <p>Screen content</p>
            </SignalWorkspaceShell>,
        )

        expect(screen.getByText('New evidence')).toBeInTheDocument()
        await user.click(screen.getByRole('button', { name: 'Refresh analysis' }))
        expect(onRefresh).toHaveBeenCalled()
    })

    it('shows model-analysis progress without hiding the selected screen', () => {
        render(
            <SignalWorkspaceShell
                caseData={makeCase('generating')}
                view="conversation"
                onViewChange={jest.fn()}
                onRefresh={jest.fn()}
            >
                <p>Conversation content</p>
            </SignalWorkspaceShell>,
        )

        expect(screen.getByRole('status')).toHaveTextContent('Finding the problem structure')
        expect(screen.getByText('Conversation content')).toBeInTheDocument()
    })
})
