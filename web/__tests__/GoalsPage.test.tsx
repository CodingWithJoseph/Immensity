import { fireEvent, render, screen, within } from '@testing-library/react'
import GoalsPage from '@/app/(core)/dashboard/(manage)/manage/goals/page'
import type { Goal } from '@/lib/types/goals'

let mockPipelineId: string | null = null
jest.mock('@/app/(core)/dashboard/contexts/WorkspaceContext', () => ({
    useWorkspace: () => ({ selectedPipelineId: mockPipelineId, setSelectedPipelineId: jest.fn(), hydrated: true }),
}))

jest.mock('@/lib/fetchJson', () => ({ fetchJson: jest.fn() }))
import { fetchJson } from '@/lib/fetchJson'

function goal(over: Partial<Goal>): Goal {
    return {
        id: 'acct_launches', category: 'portfolio', title: 'Launch products', metricKey: 'products_launched', icon: 'rocket',
        currentValue: 1, achievedCount: 1, tierCount: 3, maxThreshold: 10, state: 'active',
        tiers: [
            { tierIndex: 0, threshold: 1, label: '1', achieved: true, state: 'completed', estimateDays: 30, activatedAt: '2026-05-01T00:00:00Z', targetDate: '2026-05-31T00:00:00Z', completedAt: '2026-06-01T00:00:00Z', daysLeft: null },
            { tierIndex: 1, threshold: 5, label: '5', achieved: false, state: 'active', estimateDays: 180, activatedAt: '2026-06-01T00:00:00Z', targetDate: '2026-11-28T00:00:00Z', completedAt: null, daysLeft: 40 },
            { tierIndex: 2, threshold: 10, label: '10', achieved: false, state: 'upcoming', estimateDays: 365, activatedAt: null, targetDate: null, completedAt: null, daysLeft: null },
        ],
        nextTier: { tierIndex: 1, threshold: 5, label: '5' },
        activeTier: { tierIndex: 1, threshold: 5, label: '5', estimateDays: 180, activatedAt: '2026-06-01T00:00:00Z', targetDate: '2026-11-28T00:00:00Z', daysLeft: 40 },
        activatedAt: '2026-06-01T00:00:00Z', targetDate: '2026-11-28T00:00:00Z',
        milestones: [{ tierIndex: 0, label: '1', threshold: 1, achievedAt: '2026-06-01T00:00:00Z', activatedAt: '2026-05-01T00:00:00Z', targetDate: '2026-05-31T00:00:00Z' }],
        ...over,
    }
}

afterEach(() => { jest.clearAllMocks(); mockPipelineId = null })

describe('GoalsPage', () => {
    it('defaults to the Active tab and shows only the active goals', async () => {
        (fetchJson as jest.Mock).mockImplementation((url: string) =>
            url === '/api/portfolio/goals' ? Promise.resolve({ data: [goal({})] }) : Promise.resolve({ data: [] }))

        render(<GoalsPage />)

        expect(await screen.findByRole('heading', { name: 'Goals', level: 1 })).toBeInTheDocument()

        // Active tab is selected by default; its section shows the active goal.
        expect(await screen.findByRole('tab', { name: /Active/, selected: true })).toBeInTheDocument()
        const active = screen.getByText('Active Goals').closest('section') as HTMLElement
        expect(within(active).getByText('Products launched')).toBeInTheDocument()
        expect(within(active).getByText('Jun 1, 2026')).toBeInTheDocument()   // Activated
        expect(within(active).getByText('Nov 28, 2026')).toBeInTheDocument()  // Target
        expect(within(active).getByText('40 days left')).toBeInTheDocument()

        // The other sections are not rendered while Active is selected.
        expect(screen.queryByText('Upcoming Goals')).not.toBeInTheDocument()
        expect(screen.queryByText('Completed Goals')).not.toBeInTheDocument()

        // The rail stays visible regardless of tab.
        expect(screen.getByText('Goal Progress Overview')).toBeInTheDocument()
        expect(screen.getByText('Timeline Outlook')).toBeInTheDocument()
    })

    it('switches sections when a tab is selected', async () => {
        (fetchJson as jest.Mock).mockImplementation((url: string) =>
            url === '/api/portfolio/goals' ? Promise.resolve({ data: [goal({})] }) : Promise.resolve({ data: [] }))

        render(<GoalsPage />)

        // Upcoming tab → the locked upcoming milestone ("After {tier} · ~Nd"), not a fabricated date.
        fireEvent.click(await screen.findByRole('tab', { name: /Upcoming/ }))
        const upcoming = screen.getByText('Upcoming Goals').closest('section') as HTMLElement
        expect(within(upcoming).getByText(/^After /)).toBeInTheDocument()
        expect(screen.queryByText('Active Goals')).not.toBeInTheDocument()

        // Completed tab → the completed milestone log.
        fireEvent.click(screen.getByRole('tab', { name: /Completed/ }))
        const completed = screen.getByText('Completed Goals').closest('section') as HTMLElement
        expect(within(completed).getByText(/Completed Jun 1, 2026/)).toBeInTheDocument()

        // Archived tab → empty state (no fully-completed groups in this fixture).
        fireEvent.click(screen.getByRole('tab', { name: /Archived/ }))
        expect(screen.getByText('No archived goals yet')).toBeInTheDocument()
    })

    it('shows an empty state when there are no goals', async () => {
        (fetchJson as jest.Mock).mockResolvedValue({ data: [] })
        render(<GoalsPage />)
        expect(await screen.findByText('No goals yet')).toBeInTheDocument()
    })

    it('shows the selected project goals (from the top-bar workspace scope)', async () => {
        mockPipelineId = 'p1'
        const projectGoal = goal({ id: 'proj_problems', title: 'Problems defined', metricKey: 'problems_defined', category: 'discovery' })
        ;(fetchJson as jest.Mock).mockImplementation((url: string) => {
            if (url === '/api/portfolio/p1/goals') return Promise.resolve({ data: [projectGoal] })
            if (url === '/api/pipeline/p1') return Promise.resolve({ data: { id: 'p1', name: 'Alpha', displayName: 'Alpha' } })
            return Promise.resolve({ data: [] })
        })

        render(<GoalsPage />)

        // Scope caption + goal chip reflect the selected project, and its goals render.
        expect((await screen.findAllByText('Alpha')).length).toBeGreaterThan(0)
        const active = await screen.findByText('Active Goals')
        expect(within(active.closest('section') as HTMLElement).getAllByText('Problems defined').length).toBeGreaterThan(0)
    })

    it('shows account goals with no project selected (Account scope)', async () => {
        mockPipelineId = null
        ;(fetchJson as jest.Mock).mockImplementation((url: string) =>
            url === '/api/portfolio/goals' ? Promise.resolve({ data: [goal({})] }) : Promise.resolve({ data: [] }))
        render(<GoalsPage />)
        // Account-scoped goals load (via /api/portfolio/goals) and carry the Account badge.
        expect(await screen.findByText('Products launched')).toBeInTheDocument()
        expect(screen.getAllByText('Account').length).toBeGreaterThan(0)
    })
})
