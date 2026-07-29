import { fireEvent, render, screen, within } from '@testing-library/react'
import CalendarPage from '@/app/(core)/dashboard/(manage)/manage/calendar/page'
import TimelineGantt from '@/app/(core)/dashboard/(manage)/manage/calendar/TimelineGantt'
import type { PipelineCard } from '@/lib/types/cluster'
import type { Goal } from '@/lib/types/goals'
import type { CalendarTask } from '@/lib/calendarEvents'

jest.mock('next/navigation', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => '/dashboard/manage/calendar',
}))

let mockPipelineId: string | null = 'pipe-1'
jest.mock('@/app/(core)/dashboard/contexts/WorkspaceContext', () => ({
    useWorkspace: () => ({ selectedPipelineId: mockPipelineId, setSelectedPipelineId: jest.fn(), hydrated: true }),
}))

jest.mock('@/lib/fetchJson', () => ({ fetchJson: jest.fn() }))
import { fetchJson } from '@/lib/fetchJson'

const card = { timelineStart: '2026-06-01', timelineDays: 30, timelineTargetLaunch: '2026-07-01', launchedAt: null } as PipelineCard
const tasks: CalendarTask[] = [{ id: 't1', title: 'Ship docs', status: 'todo', dueDate: '2026-06-20' }]

function routeFetch(url: string) {
    if (url.startsWith('/api/tasks?')) return Promise.resolve({ data: tasks })
    if (url === '/api/pipeline/pipe-1') return Promise.resolve({ data: card })
    if (url.endsWith('/goals')) return Promise.resolve({ data: [] as Goal[] })
    if (url.startsWith('/api/tasks/deadline-summary')) return Promise.resolve({ overdue: 0, dueSoon: 0, nextDueDate: null })
    return Promise.resolve({ data: null })
}

afterEach(() => { jest.clearAllMocks(); mockPipelineId = 'pipe-1' })

describe('Calendar view toggle', () => {
    it('defaults to the Timeline (Gantt) view and can switch to Month', async () => {
        mockPipelineId = 'pipe-1'
        ;(fetchJson as jest.Mock).mockImplementation(routeFetch)
        render(<CalendarPage />)

        // Timeline is selected by default; the launch phase mark renders in the Gantt.
        expect(await screen.findByRole('tab', { name: 'timeline', selected: true })).toBeInTheDocument()
        expect(await screen.findByText('Launch target')).toBeInTheDocument()
        expect(screen.getAllByText('Discovery').length).toBeGreaterThan(0) // legend + phase label
        // Month-only chrome (weekday header) is absent in Timeline mode.
        expect(screen.queryByText('Sun')).not.toBeInTheDocument()

        // Switch to Month → the month grid appears, the Gantt (its legend) goes away.
        fireEvent.click(screen.getByRole('tab', { name: 'month' }))
        expect(screen.getByText('Sun')).toBeInTheDocument()
        expect(screen.queryByText('Time remaining')).not.toBeInTheDocument()

        // Back to Timeline.
        fireEvent.click(screen.getByRole('tab', { name: 'timeline' }))
        expect(screen.getByText('Time remaining')).toBeInTheDocument()
    })
})

describe('Calendar account scope', () => {
    const accountGoals = [{
        id: 'acct_launches', category: 'portfolio', title: 'Launch products', metricKey: 'products_launched', icon: 'rocket',
        currentValue: 2, achievedCount: 1, tierCount: 2, maxThreshold: 5, state: 'active',
        tiers: [
            { tierIndex: 0, threshold: 1, label: '1', achieved: true, state: 'completed', estimateDays: 30, activatedAt: '2026-06-01T00:00:00Z', targetDate: '2026-07-01T00:00:00Z', completedAt: '2026-06-20T00:00:00Z', daysLeft: null },
            { tierIndex: 1, threshold: 5, label: '5', achieved: false, state: 'active', estimateDays: 30, activatedAt: '2026-06-20T00:00:00Z', targetDate: '2026-07-20T00:00:00Z', completedAt: null, daysLeft: 12 },
        ],
        nextTier: { tierIndex: 1, threshold: 5, label: '5' },
        activeTier: { tierIndex: 1, threshold: 5, label: '5', estimateDays: 30, activatedAt: '2026-06-20T00:00:00Z', targetDate: '2026-07-20T00:00:00Z', daysLeft: 12 },
        activatedAt: '2026-06-20T00:00:00Z', targetDate: '2026-07-20T00:00:00Z', milestones: [],
    }] as unknown as Goal[]

    function accountFetch(url: string) {
        if (url === '/api/portfolio/goals') return Promise.resolve({ data: accountGoals })
        return routeFetch(url)
    }

    it('shows the account view (goal lanes) when no project is selected', async () => {
        mockPipelineId = null // Account scope, driven by the global picker
        ;(fetchJson as jest.Mock).mockImplementation(accountFetch)
        render(<CalendarPage />)

        // Account gantt renders the account goal lane (by display name) with its countdown.
        expect(await screen.findByText('Products launched')).toBeInTheDocument()
        expect(screen.getByText('12 days left')).toBeInTheDocument()
        // No per-project Timeline/Month toggle in account scope; the local scope toggle is gone.
        expect(screen.queryByRole('tab', { name: 'month' })).not.toBeInTheDocument()
        expect(screen.queryByRole('tab', { name: 'Account' })).not.toBeInTheDocument()
    })
})

describe('TimelineGantt', () => {
    const NOW = new Date('2026-07-08T12:00:00Z')

    it('renders the launch phase mark and a tasks lane with a due-date marker', () => {
        render(<TimelineGantt card={card} goals={[]} tasks={tasks} now={NOW} />)
        // Launch is now a phase band + mark in the axis header, not a lane.
        expect(screen.getByText('Launch target')).toBeInTheDocument()
        const tasksLane = screen.getByText('Tasks').closest('div')!.parentElement as HTMLElement
        expect(within(tasksLane).getByTitle(/Ship docs/)).toBeInTheDocument()
    })

    it('shows an empty state when the project has no dated content', () => {
        render(<TimelineGantt card={null} goals={[]} tasks={[]} now={NOW} />)
        expect(screen.getByText(/No timeline yet/)).toBeInTheDocument()
    })

    it('links a goal lane label to the Goals page (one-journey loop)', () => {
        const goal = {
            id: 'proj_signups', category: 'growth', title: 'Signups', metricKey: 'signups', icon: 'user-plus',
            currentValue: 6, achievedCount: 0, tierCount: 1, maxThreshold: 10, state: 'active',
            tiers: [{ tierIndex: 0, threshold: 10, label: '10', achieved: false, state: 'active', estimateDays: 30, activatedAt: '2026-06-20T00:00:00Z', targetDate: '2026-07-20T00:00:00Z', completedAt: null, daysLeft: 12 }],
            nextTier: { tierIndex: 0, threshold: 10, label: '10' },
            activeTier: { tierIndex: 0, threshold: 10, label: '10', estimateDays: 30, activatedAt: '2026-06-20T00:00:00Z', targetDate: '2026-07-20T00:00:00Z', daysLeft: 12 },
            activatedAt: '2026-06-20T00:00:00Z', targetDate: '2026-07-20T00:00:00Z', milestones: [],
        } as unknown as Goal
        render(<TimelineGantt card={null} goals={[goal]} tasks={[]} now={NOW} />)
        const link = screen.getByTitle(/Manage goal/)
        expect(link.tagName).toBe('A')
        expect(link).toHaveAttribute('href', '/dashboard/manage/goals')
    })

    it('renders the countdown chip at the target and a muted next-tier projection', () => {
        const goal = {
            id: 'proj_signups', category: 'growth', title: 'Signups', metricKey: 'signups', icon: 'user-plus',
            currentValue: 6, achievedCount: 0, tierCount: 2, maxThreshold: 50, state: 'active',
            tiers: [
                { tierIndex: 0, threshold: 10, label: '10', achieved: false, state: 'active', estimateDays: 30, activatedAt: '2026-06-20T00:00:00Z', targetDate: '2026-07-20T00:00:00Z', completedAt: null, daysLeft: 12 },
                { tierIndex: 1, threshold: 50, label: '50', achieved: false, state: 'upcoming', estimateDays: 60, activatedAt: null, targetDate: null, completedAt: null, daysLeft: null },
            ],
            nextTier: { tierIndex: 0, threshold: 10, label: '10' },
            activeTier: { tierIndex: 0, threshold: 10, label: '10', estimateDays: 30, activatedAt: '2026-06-20T00:00:00Z', targetDate: '2026-07-20T00:00:00Z', daysLeft: 12 },
            activatedAt: '2026-06-20T00:00:00Z', targetDate: '2026-07-20T00:00:00Z', milestones: [],
        } as unknown as Goal
        render(<TimelineGantt card={null} goals={[goal]} tasks={[]} now={NOW} />)
        // Countdown shows as a chip (not embedded in the bar).
        expect(screen.getByText('12 days left')).toBeInTheDocument()
        // The next tier renders as a single muted projection, not a row of locked chips.
        expect(screen.getByTitle(/Next: 50 · projected/)).toBeInTheDocument()
        // The active bar splits into elapsed (solid fill) vs remaining: the fill is a
        // partial width, not the whole bar (activated Jun 20, today Jul 8, target Jul 20).
        const activeBar = screen.getByTitle(/^10 · /)
        const fill = activeBar.querySelector('span[aria-hidden]') as HTMLElement
        const fillWidth = parseFloat(fill.style.width)
        expect(fillWidth).toBeGreaterThan(0)
        expect(fillWidth).toBeLessThan(100)
    })

    it('expands a goal lane into its tier ladder', () => {
        const goal = {
            id: 'proj_signups', category: 'growth', title: 'Signups', metricKey: 'signups', icon: 'user-plus',
            currentValue: 6, achievedCount: 0, tierCount: 2, maxThreshold: 50, state: 'active',
            tiers: [
                { tierIndex: 0, threshold: 10, label: '10', achieved: false, state: 'active', estimateDays: 30, activatedAt: '2026-06-20T00:00:00Z', targetDate: '2026-07-20T00:00:00Z', completedAt: null, daysLeft: 12 },
                { tierIndex: 1, threshold: 50, label: '50', achieved: false, state: 'upcoming', estimateDays: 60, activatedAt: null, targetDate: null, completedAt: null, daysLeft: null },
            ],
            nextTier: { tierIndex: 0, threshold: 10, label: '10' },
            activeTier: { tierIndex: 0, threshold: 10, label: '10', estimateDays: 30, activatedAt: '2026-06-20T00:00:00Z', targetDate: '2026-07-20T00:00:00Z', daysLeft: 12 },
            activatedAt: '2026-06-20T00:00:00Z', targetDate: '2026-07-20T00:00:00Z', milestones: [],
        } as unknown as Goal
        render(<TimelineGantt card={null} goals={[goal]} tasks={[]} now={NOW} />)

        // The locked tier's row is hidden until expanded.
        expect(screen.queryByText(/Locked · starts after 10/)).not.toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: /Expand/ }))
        expect(screen.getByText(/Locked · starts after 10/)).toBeInTheDocument()
    })

    it('narrows the visible window: fewer month labels in 3m than All', () => {
        // A long launch window spanning ~13 months.
        const longCard = { timelineStart: '2026-06-01', timelineDays: 400, timelineTargetLaunch: '2027-07-06', launchedAt: null } as PipelineCard
        render(<TimelineGantt card={longCard} goals={[]} tasks={[]} now={NOW} />)
        const monthLabels = () => screen.getAllByText(/^[A-Z][a-z]{2} \d{2}$/)

        fireEvent.click(screen.getByRole('button', { name: 'All' }))
        const allCount = monthLabels().length
        fireEvent.click(screen.getByRole('button', { name: '3m' }))
        const threeCount = monthLabels().length

        expect(threeCount).toBeLessThan(allCount)
        expect(threeCount).toBeLessThanOrEqual(4)
    })
})
