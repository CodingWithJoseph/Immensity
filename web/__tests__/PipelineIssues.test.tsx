import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import PipelineCardPanel from '@/app/(core)/dashboard/(manage)/manage/pipeline/PipelineCardPanel'
import type { PipelineCard } from '@/lib/types/cluster'

jest.mock('@/lib/firebase', () => ({
    auth: { currentUser: { displayName: 'Joseph', email: 'joseph@example.com', photoURL: null } },
}))

function response(body: unknown) {
    return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(JSON.stringify(body)),
    } as Response)
}

function card(overrides: Partial<PipelineCard> = {}): PipelineCard {
    return {
        id: 'pipe-1',
        name: 'PC boot failures',
        teamId: null,
        team: null,
        postIds: ['1', '2'],
        sourceClusterId: '42',
        stage: 'watching',
        killCriteria: null,
        distributionChannels: [],
        clusterMetrics: null,
        posts: [],
        launchedAt: null,
        removedAt: null,
        createdAt: '2026-06-16T00:00:00Z',
        updatedAt: '2026-06-16T00:00:00Z',
        openIssueCount: 0,
        openKillCriteriaCount: 0,
        ...overrides,
    }
}

describe('PipelineCardPanel issues summary', () => {
    afterEach(() => jest.clearAllMocks())

    it('loads and links current issues for the selected pipeline card', async () => {
        global.fetch = jest.fn((url: string) => {
            if (url.includes('issueType=kill_criteria')) return response({ data: [] })
            return response({
                data: [
                    {
                        id: 'issue-1',
                        userId: 'user-1',
                        teamId: null,
                        pipelineId: 'pipe-1',
                        parentIssueId: null,
                        title: 'Analyze signals',
                        summary: null,
                        status: 'open',
                        issueType: 'issue',
                        position: 0,
                        source: 'analyze_signals',
                        commentCount: 0,
                        subIssueCount: 2,
                        createdAt: '2026-06-16T00:00:00Z',
                        updatedAt: '2026-06-16T00:00:00Z',
                        closedAt: null,
                    },
                ],
            })
        }) as unknown as typeof fetch

        render(
            <PipelineCardPanel
                card={card()}
                onClose={jest.fn()}
                onLaunch={jest.fn()}
                onRemove={jest.fn()}
                onUpdate={jest.fn()}
            />,
        )

        await waitFor(() => expect(screen.getByText('Analyze signals')).toBeInTheDocument())
        expect(screen.getByText('Analyze signals').closest('a')).not.toHaveClass('border-b')
        const currentIssuesSection = screen.getByText('Current issues').closest('section')!
        const killCriteriaSection = screen.getByText('Kill criteria').closest('section')!
        expect(currentIssuesSection.parentElement).toHaveClass('divide-y')
        expect(screen.getByText('Current issues')).toHaveClass('text-(--color-text)', 'font-semibold')
        expect(within(currentIssuesSection).getByText('1').parentElement).toHaveClass('border-0', 'bg-[var(--chip-warning-bg)]', 'text-[var(--chip-warning-text)]')
        expect(within(killCriteriaSection).getByText('0').parentElement).toHaveClass('border-0', 'bg-[var(--chip-warning-bg)]', 'text-[var(--chip-warning-text)]')
        expect(within(currentIssuesSection).queryByText('Open')).not.toBeInTheDocument()
        expect(within(currentIssuesSection).queryByText('Issue')).not.toBeInTheDocument()
        expect(screen.getByText('Watching').parentElement).toHaveClass('border-0', 'bg-[var(--chip-info-bg)]', 'text-[var(--chip-info-text)]')
        expect(within(currentIssuesSection).getByText('View')).toHaveClass('font-medium', 'text-(--color-link)')
        const openIssuesLinks = screen.getAllByRole('link', { name: 'Open Issues' })
        expect(openIssuesLinks).toHaveLength(2)
        expect(openIssuesLinks[0]).toHaveAttribute('href', '/dashboard/manage/issues?pipelineId=pipe-1&issueType=kill_criteria')
        expect(openIssuesLinks[1]).toHaveAttribute('href', '/dashboard/manage/issues?pipelineId=pipe-1&issueType=issue')
        expect(screen.getByRole('button', { name: 'Close panel' })).toHaveClass('hover:border-(--color-error)', 'hover:text-(--color-error)')
        expect(global.fetch).toHaveBeenCalledWith('/api/issues?pipelineId=pipe-1&status=open&issueType=issue', undefined)
        expect(global.fetch).toHaveBeenCalledWith('/api/issues?pipelineId=pipe-1&status=open&issueType=kill_criteria', undefined)
        expect(screen.queryByRole('button', { name: 'Move to Building' })).not.toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Actions' }))

        expect(screen.queryByRole('menuitem', { name: 'Move to Building' })).not.toBeInTheDocument()
        expect(screen.getByRole('menuitem', { name: 'Remove project' })).toBeInTheDocument()
        expect(screen.getByRole('menuitem', { name: 'Remove project' })).toHaveClass('text-(--color-error)')

        fireEvent.click(screen.getByRole('menuitem', { name: 'Remove project' }))

        expect(screen.getByText('Remove this project?')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument()
    })

    it('shows readiness and the advisory launch warning for a building project', async () => {
        global.fetch = jest.fn((url: string) => {
            if (url.startsWith('/api/problems')) {
                return response({ data: [{ id: 'problem-1' }, { id: 'problem-2' }] })
            }
            if (url.startsWith('/api/tasks')) {
                return response({
                    data: [
                        { id: 'task-1', problemId: 'problem-1', status: 'done' },
                        { id: 'task-2', problemId: 'problem-2', status: 'in_progress' },
                    ],
                })
            }
            return response({ data: [] })
        }) as unknown as typeof fetch

        render(
            <PipelineCardPanel
                card={card({ stage: 'building' })}
                onClose={jest.fn()}
                onLaunch={jest.fn()}
                onRemove={jest.fn()}
                onUpdate={jest.fn()}
                initialLaunchPrompt
            />,
        )

        expect(screen.getByText('Readiness')).toBeInTheDocument()
        expect(screen.getByText('Breakdown verified')).toBeInTheDocument()
        expect(screen.getByText('Tasks verified')).toBeInTheDocument()
        expect(screen.getByText('Breakdown verified').parentElement).not.toHaveClass('border-b')
        expect(screen.getByText('Readiness').closest('section')?.parentElement).toHaveClass('divide-y')
        expect(screen.queryByText('Tasks built')).not.toBeInTheDocument()
        expect(screen.queryByText('Verified problem-task pairs')).not.toBeInTheDocument()
        expect(screen.queryByText('Monitoring setup')).not.toBeInTheDocument()
        expect(screen.getByText('Launch before the recommended target?')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Launch Anyway' })).toBeInTheDocument()
        expect(screen.getAllByText('Continue Building').length).toBeGreaterThan(0)
        await waitFor(() => expect(screen.getAllByText('2 / 20').length).toBeGreaterThan(0))
    })

    it('keeps building actions behind one primary action and one menu', async () => {
        global.fetch = jest.fn(() => response({ data: [] })) as unknown as typeof fetch

        render(
            <PipelineCardPanel
                card={card({ stage: 'building' })}
                onClose={jest.fn()}
                onLaunch={jest.fn()}
                onRemove={jest.fn()}
                onUpdate={jest.fn()}
            />,
        )

        expect(screen.getByRole('link', { name: 'Continue Building' })).toBeInTheDocument()
        expect(screen.queryByRole('menuitem', { name: 'Mark launched' })).not.toBeInTheDocument()
        expect(screen.queryByRole('menuitem', { name: 'Remove project' })).not.toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Actions' }))

        expect(screen.getByRole('menuitem', { name: 'Mark launched' })).toBeInTheDocument()
        expect(screen.getByRole('menuitem', { name: 'Remove project' })).toBeInTheDocument()
        expect(screen.getByRole('menuitem', { name: 'Open in Signal' })).toBeInTheDocument()
        expect(screen.queryByRole('menuitem', { name: 'Remove from Pipeline' })).not.toBeInTheDocument()
        await waitFor(() => expect(screen.queryAllByText('Loading...')).toHaveLength(0))
    })

    it('shows monitoring and health with a compact action model for a launched project', async () => {
        global.fetch = jest.fn((url: string) => {
            if (url.endsWith('/usage')) {
                return response({
                    data: {
                        source: { pipelineId: 'pipe-1' },
                        connected: true,
                        lastSeenAt: '2026-06-20T00:00:00Z',
                        summary14d: { visitors: 120, activeUsers: 42 },
                        growth: { visitors: { current: 120, previous: 105, changePct: 0.142 } },
                        health: { state: 'healthy', label: 'Healthy', reason: 'No events received yet' },
                    },
                })
            }
            if (url.endsWith('/revenue')) return response({ data: { source: null, connected: false, summary: { mrrCents: 0 } } })
            if (url.endsWith('/errors')) return response({ data: { source: { pipelineId: 'pipe-1' }, connected: true, summary14d: { errors: 3 } } })
            return response({ data: [] })
        }) as unknown as typeof fetch

        const onClose = jest.fn()
        const { container } = render(
            <PipelineCardPanel
                card={card({ launchedAt: '2026-06-01T00:00:00Z', status: 'active' })}
                onClose={onClose}
                onLaunch={jest.fn()}
                onRemove={jest.fn()}
                onUpdate={jest.fn()}
            />,
        )

        expect(screen.getByText('Monitoring setup')).toBeInTheDocument()
        expect(screen.getByText('Health summary')).toBeInTheDocument()
        expect(screen.getByText('Monitoring setup')).toHaveClass('text-(--color-text)', 'font-semibold')
        expect(screen.getByText('Health summary')).toHaveClass('text-(--color-text)', 'font-semibold')
        expect(screen.getByText('Days since launch')).toBeInTheDocument()
        expect(screen.getByText('Days since launch').parentElement).not.toHaveClass('border-b')
        expect(screen.getByText('Usage').parentElement).not.toHaveClass('border-b')
        expect(screen.getByText('Traffic').parentElement).not.toHaveClass('border-b')
        expect(screen.getByText('Monitoring setup').closest('section')?.parentElement).toHaveClass('divide-y')
        expect(screen.queryByText('Readiness')).not.toBeInTheDocument()
        expect(screen.getByText('Live').parentElement).toHaveClass('bg-[var(--chip-success-bg)]')
        expect(screen.queryByRole('link', { name: 'Open in Monitor' })).not.toBeInTheDocument()
        expect(screen.queryByRole('menuitem', { name: 'Open in Monitor' })).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Actions' })).toBeInTheDocument()
        expect(screen.queryByRole('menuitem', { name: 'Pause project' })).not.toBeInTheDocument()

        // Panel is wrapped in a click-outside overlay (consistent with the Teams drawer).
        const overlay = container.querySelector('div.fixed.inset-0')
        expect(overlay).toBeInTheDocument()
        fireEvent.click(within(overlay as HTMLElement).getByRole('heading', { name: 'PC boot failures' }))
        expect(onClose).not.toHaveBeenCalled() // clicks inside the panel do not close it
        fireEvent.click(overlay as HTMLElement)
        expect(onClose).toHaveBeenCalledTimes(1) // clicking the backdrop closes it

        fireEvent.click(screen.getByRole('button', { name: 'Actions' }))

        expect(screen.getByRole('menuitem', { name: 'Open in Monitor' })).toBeInTheDocument()
        expect(screen.getByRole('menuitem', { name: 'Pause project' })).toBeInTheDocument()
        expect(screen.getByRole('menuitem', { name: 'Remove product' })).toBeInTheDocument()
        expect(screen.queryByRole('menuitem', { name: 'Sunset product' })).not.toBeInTheDocument()
        expect(screen.queryByRole('menuitem', { name: 'Retire product' })).not.toBeInTheDocument()
        expect(screen.queryByRole('menuitem', { name: 'Remove from Portfolio' })).not.toBeInTheDocument()

        await waitFor(() => expect(screen.getByText('120')).toBeInTheDocument())
        const healthSection = screen.getByText('Health summary').closest('section')
        expect(within(healthSection!).getByText('No data').parentElement).toHaveClass('grid', 'w-44')
        expect(screen.getAllByText('No prior')).toHaveLength(2)
        expect(screen.getAllByText('14.2%')).toHaveLength(2)
        expect(screen.queryByText('No events received yet')).not.toBeInTheDocument()
        expect(screen.queryByRole('link', { name: 'Open detailed monitoring →' })).not.toBeInTheDocument()
    })

    it('rejects monitoring data scoped to a different project', async () => {
        global.fetch = jest.fn((url: string) => {
            if (url.endsWith('/usage')) {
                return response({
                    data: {
                        source: { pipelineId: 'immensity-project' },
                        connected: true,
                        totalEvents: 999,
                        summary14d: { visitors: 999, activeUsers: 999 },
                        health: { state: 'healthy', label: 'Healthy' },
                    },
                })
            }
            if (url.endsWith('/revenue')) {
                return response({ data: { source: { pipelineId: 'immensity-project' }, connected: true, summary: { mrrCents: 99900 } } })
            }
            if (url.endsWith('/errors')) {
                return response({ data: { source: { pipelineId: 'immensity-project' }, connected: true, summary14d: { errors: 999 } } })
            }
            return response({ data: [] })
        }) as unknown as typeof fetch

        render(
            <PipelineCardPanel
                card={card({ launchedAt: '2026-06-01T00:00:00Z', status: 'active' })}
                onClose={jest.fn()}
                onLaunch={jest.fn()}
                onRemove={jest.fn()}
                onUpdate={jest.fn()}
            />,
        )

        const setupSection = screen.getByText('Monitoring setup').closest('section')
        await waitFor(() => expect(within(setupSection!).getAllByText('Not connected')).toHaveLength(3))
        const healthSection = screen.getByText('Health summary').closest('section')
        expect(within(healthSection!).getAllByText('No data')).toHaveLength(5)
        expect(within(healthSection!).queryByText('999')).not.toBeInTheDocument()
        expect(within(healthSection!).queryByText('$999')).not.toBeInTheDocument()
    })

    it('shows configured project sources as connected but health as no data before events arrive', async () => {
        global.fetch = jest.fn((url: string) => {
            if (url.endsWith('/usage')) {
                return response({
                    data: {
                        source: { pipelineId: 'pipe-1' },
                        connected: true,
                        totalEvents: 0,
                        summary14d: { visitors: 0, activeUsers: 0 },
                        daily: [],
                        health: { state: 'no-data', label: 'No data' },
                    },
                })
            }
            if (url.endsWith('/revenue')) return response({ data: { source: null, connected: false, summary: { mrrCents: null } } })
            if (url.endsWith('/errors')) {
                return response({ data: { source: { pipelineId: 'pipe-1' }, connected: true, summary14d: { errors: 0 }, daily: [] } })
            }
            return response({ data: [] })
        }) as unknown as typeof fetch

        render(
            <PipelineCardPanel
                card={card({ launchedAt: '2026-06-01T00:00:00Z', status: 'active' })}
                onClose={jest.fn()}
                onLaunch={jest.fn()}
                onRemove={jest.fn()}
                onUpdate={jest.fn()}
            />,
        )

        const setupSection = screen.getByText('Monitoring setup').closest('section')
        await waitFor(() => expect(within(setupSection!).getAllByText('Connected')).toHaveLength(2))
        expect(within(setupSection!).getByText('Not connected')).toBeInTheDocument()
        expect(within(screen.getByText('Health summary').closest('section')!).getAllByText('No data').length).toBeGreaterThan(0)
    })

    it('keeps legacy lifecycle states reversible without competing transitions', async () => {
        global.fetch = jest.fn((url: string) => {
            if (url.endsWith('/usage') || url.endsWith('/revenue') || url.endsWith('/errors')) return response({ data: null })
            return response({ data: [] })
        }) as unknown as typeof fetch

        render(
            <PipelineCardPanel
                card={card({ launchedAt: '2026-06-01T00:00:00Z', status: 'sunsetting' })}
                onClose={jest.fn()}
                onLaunch={jest.fn()}
                onRemove={jest.fn()}
                onUpdate={jest.fn()}
            />,
        )

        fireEvent.click(screen.getByRole('button', { name: 'Actions' }))

        expect(screen.getByRole('menuitem', { name: 'Reopen product' })).toBeInTheDocument()
        expect(screen.getByRole('menuitem', { name: 'Remove product' })).toBeInTheDocument()
        expect(screen.queryByRole('menuitem', { name: 'Pause project' })).not.toBeInTheDocument()
        expect(screen.queryByRole('menuitem', { name: 'Retire product' })).not.toBeInTheDocument()
        await waitFor(() => expect(screen.queryAllByText('Loading...')).toHaveLength(0))
    })

    it('caps visible current issues at three', async () => {
        const issues = Array.from({ length: 4 }, (_, index) => ({
            id: `issue-${index + 1}`,
            title: `Issue ${index + 1}`,
        }))
        global.fetch = jest.fn((url: string) => {
            if (url.includes('issueType=issue')) return response({ data: issues })
            return response({ data: [] })
        }) as unknown as typeof fetch

        render(
            <PipelineCardPanel
                card={card()}
                onClose={jest.fn()}
                onLaunch={jest.fn()}
                onRemove={jest.fn()}
                onUpdate={jest.fn()}
            />,
        )

        await screen.findByText('Issue 3')
        expect(screen.queryByText('Issue 4')).not.toBeInTheDocument()
        expect(screen.getByRole('link', { name: /View all issues/ })).toHaveAttribute('href', '/dashboard/manage/issues?pipelineId=pipe-1&issueType=issue')
    })

    it('shows the assigned team with the shared identity pattern', async () => {
        global.fetch = jest.fn(() => response({ data: [] })) as unknown as typeof fetch

        render(
            <PipelineCardPanel
                card={card({
                    teamId: 'team-1',
                    team: { id: 'team-1', name: 'Validation Team' } as PipelineCard['team'],
                })}
                onClose={jest.fn()}
                onLaunch={jest.fn()}
                onRemove={jest.fn()}
                onUpdate={jest.fn()}
            />,
        )

        await waitFor(() => expect(screen.getByText('Validation Team')).toBeInTheDocument())
        expect(screen.getByText('Validation Team').parentElement).toHaveClass('inline-flex')
        expect(screen.getByTitle('Validation Team')).toBeInTheDocument()
        expect(screen.queryByLabelText('Project team')).not.toBeInTheDocument()
        expect(global.fetch).not.toHaveBeenCalledWith('/api/teams')
    })

})
