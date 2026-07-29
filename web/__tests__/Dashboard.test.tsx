import { render, screen, waitFor } from '@testing-library/react'

const mockUser = { getIdToken: jest.fn().mockResolvedValue('token'), displayName: 'Joe Smith', email: 'joe@example.com' }

jest.mock('@/lib/auth-context', () => ({
    useAuth: () => ({ user: mockUser, authReady: true }),
}))

jest.mock('next/navigation', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}))

// Stub the dashboard modules so we can assert the page composes them from the
// mocked dashboard API data without pulling in each module's own effects.
jest.mock('@/app/(core)/dashboard/components/DiscoveryActivityCard', () => ({
    __esModule: true,
    default: () => require('react').createElement('div', { 'data-testid': 'discovery-activity' }),
    DiscoveryMetricsCard: () => require('react').createElement('div', { 'data-testid': 'discovery-metrics' }),
}))
jest.mock('@/app/(core)/dashboard/components/columns/PipelineActivityColumn', () => ({
    __esModule: true,
    default: () => require('react').createElement('div', { 'data-testid': 'col-pipeline' }),
    PipelineSummaryCard: (props: { cards: unknown[] | null }) =>
        require('react').createElement('div', { 'data-testid': 'pipeline-summary' }, `pipeline:${props.cards?.length ?? 'null'}`),
    PipelineProgressListCard: (props: { cards: unknown[] | null }) =>
        require('react').createElement('div', { 'data-testid': 'pipeline-progress' }, `progress:${props.cards?.length ?? 'null'}`),
}))
jest.mock('@/app/(core)/dashboard/components/MomentumMoversCard', () => ({
    __esModule: true,
    default: () => require('react').createElement('div', { 'data-testid': 'momentum-movers' }),
}))
jest.mock('@/app/(core)/dashboard/components/DashboardCalendarCard', () => ({
    __esModule: true,
    default: (props: { cards: unknown[] | null }) =>
        require('react').createElement('div', { 'data-testid': 'calendar-card' }, `calendar:${props.cards?.length ?? 'null'}`),
}))
jest.mock('@/app/(core)/dashboard/components/GoalsCards', () => ({
    __esModule: true,
    AccountGoalsCard: () =>
        require('react').createElement('div', { 'data-testid': 'goals-card' }, 'goals'),
}))
jest.mock('@/app/(core)/dashboard/components/DashboardMonitorCards', () => ({
    __esModule: true,
    loadDashboardMonitorSummary: jest.fn().mockResolvedValue(null),
    DashboardRevenueCard: () => require('react').createElement('div', { 'data-testid': 'revenue-card' }),
    DashboardActiveUsersCard: () => require('react').createElement('div', { 'data-testid': 'active-users-card' }),
    DashboardActivationRateCard: () => require('react').createElement('div', { 'data-testid': 'activation-rate-card' }),
    DashboardProductHealthCard: () => require('react').createElement('div', { 'data-testid': 'product-health-card' }),
}))

import DashboardPage from '@/app/(core)/dashboard/page'

const PIPELINE = [{ id: 'p1' }]
const PORTFOLIO = [{ id: 'p2', launchedAt: '2026-06-01' }]

function jsonOk(body: unknown) {
    return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(JSON.stringify(body)),
    } as Response)
}

beforeEach(() => {
    global.fetch = jest.fn((url: string) => {
        if (url.startsWith('/api/pipeline')) return jsonOk({ data: PIPELINE })
        if (url.startsWith('/api/portfolio')) return jsonOk({ data: PORTFOLIO })
        return jsonOk({})
    }) as unknown as typeof fetch
})

afterEach(() => jest.clearAllMocks())

describe('DashboardPage', () => {
    it('renders the current dashboard rows and activity span', async () => {
        render(<DashboardPage />)

        await waitFor(() => {
            expect(screen.getByTestId('pipeline-progress')).toHaveTextContent('progress:1')
            expect(screen.getByTestId('calendar-card')).toHaveTextContent('calendar:2')
            expect(screen.getByTestId('goals-card')).toBeInTheDocument()
        })
        expect(screen.getByTestId('revenue-card')).toBeInTheDocument()
        expect(screen.getByTestId('discovery-activity')).toBeInTheDocument()
        expect(screen.getByTestId('discovery-activity').parentElement).toHaveClass('lg:col-span-2')
        expect(screen.getByTestId('calendar-card')).toBeInTheDocument()
        expect(screen.getByTestId('product-health-card')).toBeInTheDocument()
        expect(screen.getByTestId('active-users-card')).toBeInTheDocument()
        expect(screen.getByTestId('activation-rate-card')).toBeInTheDocument()
        expect(screen.getByTestId('goals-card')).toBeInTheDocument()
        expect(screen.getByTestId('discovery-metrics')).toBeInTheDocument()
        expect(screen.getByTestId('momentum-movers')).toBeInTheDocument()
    })
})
