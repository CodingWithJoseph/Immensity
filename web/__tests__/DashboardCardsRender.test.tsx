import { render, screen, waitFor } from '@testing-library/react'

const mockUser = { getIdToken: jest.fn().mockResolvedValue('token') }
jest.mock('@/lib/auth-context', () => ({
    useAuth: () => ({ user: mockUser, authReady: true }),
}))

import DashboardCalendarCard from '@/app/(core)/dashboard/components/DashboardCalendarCard'
import DiscoveryActivityCard, { DiscoveryMetricsCard } from '@/app/(core)/dashboard/components/DiscoveryActivityCard'
import {
    DashboardActivationRateCard,
    DashboardActiveUsersCard,
    DashboardProductHealthCard,
    type DashboardMonitorSummary,
} from '@/app/(core)/dashboard/components/DashboardMonitorCards'
import { TrendingClustersCard } from '@/app/(core)/dashboard/components/columns/IntelligenceFeedColumn'
import { PipelineProgressListCard } from '@/app/(core)/dashboard/components/columns/PipelineActivityColumn'
import MomentumMoversCard from '@/app/(core)/dashboard/components/MomentumMoversCard'
import type { PipelineCard } from '@/lib/types/cluster'
import type { DashboardActivity } from '@/lib/types/dashboard'

function jsonOk(body: unknown) {
    return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(JSON.stringify(body)),
    } as Response)
}

const PIPE = [
    { id: 'p1', name: 'Alpha', displayName: 'Alpha', timelineStart: '2026-06-01', timelineDays: 30, timelineTargetLaunch: '2026-07-01', launchedAt: null, removedAt: null },
    { id: 'p2', name: 'Beta', displayName: 'Beta', timelineStart: '2026-05-01', timelineDays: 30, timelineTargetLaunch: '2026-05-31', launchedAt: '2026-05-20', removedAt: null },
] as PipelineCard[]

const EMPTY_MONITOR_SUMMARY = {
    totalProducts: 1,
    reportingProducts: 1,
    revenueConnectedProducts: 0,
    revenueCents: null,
    revenueChangePct: null,
    activeUsers: 0,
    activeUserRate: null,
    activeUsersChangePct: null,
    newUsers: 0,
    newUserRate: null,
    newUsersChangePct: null,
    activations: 0,
    activationRate: null,
    healthyProducts: 0,
    attentionProducts: 0,
    unmonitoredProducts: 1,
    healthProducts: [],
} satisfies DashboardMonitorSummary

const WORKSPACE_ACTIVITY = {
    weeks: 26,
    days: [{ date: new Date().toISOString().slice(0, 10), count: 5 }],
    windowActions: 4,
    windowLogins: 1,
    activeDays: 1,
    lastActivityAt: new Date().toISOString(),
    trend: { current7d: 5, previous7d: 2, changePct: 1.5 },
} satisfies DashboardActivity

afterEach(() => jest.clearAllMocks())

function expectFeatureCategory(label: string, category: string) {
    expect(screen.getByText(label).previousElementSibling).toHaveAttribute('data-feature-category', category)
}

describe('DashboardCalendarCard', () => {
    it('renders one month grid using tasks from every project', async () => {
        global.fetch = jest.fn(() => jsonOk({ data: [] })) as unknown as typeof fetch
        render(<DashboardCalendarCard cards={PIPE} />)
        expectFeatureCategory('Calendar', 'manage')
        await waitFor(() => expect(screen.getAllByText('S').length).toBeGreaterThan(0))
        const urls = (global.fetch as jest.Mock).mock.calls.map(call => call[0])
        expect(urls).toContain('/api/tasks?pipeline_id=p1')
        expect(urls).toContain('/api/tasks?pipeline_id=p2')
    })

    it('shows the current month without project-dependent controls or copy', async () => {
        global.fetch = jest.fn(() => jsonOk({ data: [] })) as unknown as typeof fetch
        render(<DashboardCalendarCard cards={[]} />)
        await waitFor(() => expect(screen.getAllByText('S').length).toBeGreaterThan(0))
        expect(screen.queryByText(/Add a project/)).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Previous month' })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Next month' })).not.toBeInTheDocument()
    })

    it('caps a busy workspace day at three indicators', async () => {
        const dueDate = new Date().toISOString().slice(0, 10)
        const tasks = Array.from({ length: 5 }, (_, index) => ({
            id: `task-${index}`,
            title: `Task ${index}`,
            status: 'todo',
            dueDate,
        }))
        global.fetch = jest.fn(() => jsonOk({ data: tasks })) as unknown as typeof fetch

        // Timeline-less projects so the only events on the day are tasks — a
        // launch/discovery milestone landing on today would otherwise occupy a
        // capped slot and make the count depend on the calendar date.
        const busyCards = [
            { id: 'p1', name: 'Alpha', removedAt: null },
            { id: 'p2', name: 'Beta', removedAt: null },
        ] as unknown as PipelineCard[]
        render(<DashboardCalendarCard cards={busyCards} />)

        await waitFor(() => expect(screen.getAllByTitle(/Task/)).toHaveLength(3))
    })
})

describe('Dashboard list caps', () => {
    it('shows no more than three progress items', () => {
        const cards = ['One', 'Two', 'Three', 'Four'].map((name, index) => ({
            id: String(index),
            name,
            displayName: name,
            stage: 'watching',
            postIds: [],
            launchedAt: null,
            removedAt: null,
        })) as unknown as PipelineCard[]

        render(<PipelineProgressListCard cards={cards} />)
        expectFeatureCategory('Progress', 'build')
        expect(screen.getByText('One')).toBeInTheDocument()
        expect(screen.getByText('Three')).toBeInTheDocument()
        expect(screen.queryByText('Four')).not.toBeInTheDocument()
    })
})

describe('Dashboard empty state styling', () => {
    it('centers Trending Clusters in the transparent dashed card body', () => {
        render(<TrendingClustersCard clusters={[]} />)
        expectFeatureCategory('Trending clusters', 'monitor')
        expect(screen.getByText('No trending clusters right now.')).toHaveClass('items-center', 'justify-center', 'border-dashed', 'bg-transparent')
    })

    it.each([
        [DashboardActiveUsersCard, 'No workspace user activity yet.'],
        [DashboardActivationRateCard, 'No new users available to measure activation yet.'],
        [DashboardProductHealthCard, 'No product health data is available yet.'],
    ])('uses the shared transparent empty state for monitor cards', (Card, message) => {
        render(<Card summary={EMPTY_MONITOR_SUMMARY} loading={false} />)
        expect(screen.getByText(message)).toHaveClass('items-center', 'justify-center', 'border-dashed', 'bg-transparent')
    })
})

describe('Workspace activity cards', () => {
    it('labels the heatmap as user activity rather than surfaced posts', () => {
        render(<DiscoveryActivityCard activity={WORKSPACE_ACTIVITY} loading={false} />)

        expectFeatureCategory('Workspace activity', 'monitor')
        expect(screen.getByText('Workspace activity')).toBeInTheDocument()
        expect(screen.getByText('4 actions · 1 login · last 26 weeks')).toBeInTheDocument()
        expect(screen.getByTitle(/5 activity points/)).toBeInTheDocument()
    })

    it('shows login and active-day metrics', () => {
        render(<DiscoveryMetricsCard activity={WORKSPACE_ACTIVITY} loading={false} />)

        expect(screen.getByText('Activity metrics')).toBeInTheDocument()
        expect(screen.getByText('Logins (26w)')).toBeInTheDocument()
        expect(screen.getByText('Active days (26w)')).toBeInTheDocument()
    })

    it('marks momentum as Market context', () => {
        render(<MomentumMoversCard movers={null} loading={false} />)

        expectFeatureCategory('Momentum movers', 'market')
    })
})
