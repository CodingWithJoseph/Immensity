import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import MonitorDashboard from '@/app/(core)/dashboard/(monitor)/monitor/MonitorDashboard'
import MonitorSetupDashboard from '@/app/(core)/dashboard/(monitor)/monitor/MonitorSetupDashboard'
import type { PipelineCard } from '@/lib/types/cluster'

const mockReplace = jest.fn()
const mockSetSelectedPipelineId = jest.fn()
const mockAssign = jest.fn()
let mockSearchParams = ''

jest.mock('next/navigation', () => ({
    useRouter: () => ({ replace: mockReplace }),
    useSearchParams: () => new URLSearchParams(mockSearchParams),
}))

jest.mock('@/app/(core)/dashboard/contexts/WorkspaceContext', () => ({
    useWorkspace: () => ({
        selectedPipelineId: 'pipe-1',
        setSelectedPipelineId: mockSetSelectedPipelineId,
        hydrated: true,
    }),
}))

function response(body: unknown, ok = true) {
    return Promise.resolve({
        ok,
        status: ok ? 200 : 400,
        text: () => Promise.resolve(JSON.stringify(body)),
        json: () => Promise.resolve(body),
    } as Response)
}

function product(overrides: Partial<PipelineCard> = {}): PipelineCard {
    return {
        id: 'pipe-1',
        name: 'LaunchKit',
        teamId: null,
        team: null,
        postIds: [],
        sourceClusterId: null,
        stage: 'building',
        killCriteria: null,
        distributionChannels: [],
        url: 'https://launchkit.example',
        outcome: null,
        mrr: null,
        clusterMetrics: null,
        posts: [],
        launchedAt: '2026-06-01T00:00:00Z',
        removedAt: null,
        createdAt: '2026-05-01T00:00:00Z',
        updatedAt: null,
        openIssueCount: 0,
        openKillCriteriaCount: 0,
        ...overrides,
    }
}

function portfolioProduct(overrides: Partial<PipelineCard> & { usageSource?: unknown; revenueSource?: unknown } = {}) {
    const { usageSource = null, revenueSource = null, ...cardOverrides } = overrides
    return { ...product(cardOverrides), usageSource, revenueSource }
}

const source = {
    id: 'usage-source-1',
    pipelineId: 'pipe-1',
    publicKey: 'usage_public_key',
    name: 'Website usage snippet',
    status: 'connected',
    productUrl: 'https://launchkit.example',
    allowedDomain: 'launchkit.example',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    lastSeenAt: '2026-06-02T12:00:00Z',
}

const emptyUsage = {
    source: null,
    connected: false,
    totalEvents: 0,
    lastSeenAt: null,
    windowDays: 14,
    growthWindowDays: 7,
    summary14d: { pageviews: 0, visitors: 0, signups: 0, logins: 0, activations: 0, customEvents: 0, activeUsers: 0 },
    topPages: [],
    topEvents: [],
    daily: [],
    recentEvents: [],
}

const emptyRevenue = {
    source: null,
    connected: false,
    summary: {
        mrrCents: null,
        newCustomers30d: null,
        churnedCustomers30d: null,
        churnRate30d: null,
    },
}

const revenueSource = {
    id: 'revenue-source-1',
    pipelineId: 'pipe-1',
    provider: 'stripe',
    status: 'not_connected',
    providerAccountId: null,
    providerAccountLabel: null,
    currentMrrCents: null,
    newCustomers30d: null,
    churnedCustomers30d: null,
    churnRate30d: null,
    revenueSnapshot: {},
    connectedAt: null,
    lastSyncedAt: null,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
}

const emptyErrors = {
    source: null,
    connected: false,
    totalErrors: 0,
    lastSeenAt: null,
    windowDays: 14,
    summary14d: { errors: 0, openIssues: 0, affectedSessions: 0, errorsPerSession: null },
    daily: [],
    issues: [],
    recentErrors: [],
}

const emptyCorrelation = {
    days: [],
    insights: [],
    windowDays: 30,
    summary: { mrrCents: null, mrrChangePct: null, signupsChangePct: null, errorsPerSession14d: null, errorsPerSessionWindowDays: 14 },
}

const emptyAlertSettings = {
    newIssueEnabled: true,
    errorSpikeEnabled: true,
    signupsDropEnabled: true,
    revenueDropEnabled: true,
    errorSpikeMultiplier: 3,
    signupsDropPct: 0.5,
    revenueDropPct: 0.2,
}

const originalLocation = window.location

beforeAll(() => {
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...originalLocation, assign: mockAssign },
    })
})

afterAll(() => {
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
    })
})

afterEach(() => {
    jest.clearAllMocks()
    mockSearchParams = ''
})

describe('MonitorDashboard', () => {
    it('renders the usage investigation frame when monitoring is not connected', async () => {
        global.fetch = jest.fn((url: string) => {
            if (url === '/api/portfolio') return response({ data: [product()] })
            if (url === '/api/portfolio/pipe-1') return response({ data: portfolioProduct() })
            if (url === '/api/monitor/pipe-1/usage') return response({ data: emptyUsage })
            if (url === '/api/portfolio/pipe-1/revenue') return response({ data: emptyRevenue })
            if (url === '/api/monitor/pipe-1/errors') return response({ data: emptyErrors })
            if (url === '/api/monitor/pipe-1/correlation') return response({ data: emptyCorrelation })
            if (url === '/api/monitor/pipe-1/alert-settings') return response({ data: emptyAlertSettings })
            return response({ error: 'not found' }, false)
        }) as unknown as typeof fetch

        render(<MonitorDashboard initialPipelineId="pipe-1" view="usage" />)

        expect(await screen.findByRole('heading', { name: 'Usage' })).toBeInTheDocument()
        expect(screen.getByText('0 visitors and 0 signups over the last 14 days.')).toBeInTheDocument()
        expect(screen.getByText('Waiting for the first event.')).toBeInTheDocument()
        expect(screen.getByText('Product:')).toBeInTheDocument()
        expect(screen.getByText('LaunchKit')).toBeInTheDocument()
    })

    it('renders connected usage metrics without setup snippets', async () => {
        const usage = {
            ...emptyUsage,
            source,
            connected: true,
            totalEvents: 4,
            lastSeenAt: '2026-06-02T12:00:00Z',
            summary14d: { pageviews: 8, visitors: 3, signups: 1, logins: 0, activations: 1, customEvents: 0, activeUsers: 2 },
            recentEvents: [
                {
                    id: 'event-1',
                    eventType: 'signup',
                    visitorId: 'visitor-1',
                    userId: null,
                    url: 'https://launchkit.example/signup',
                    referrer: null,
                    metadata: {},
                    occurredAt: '2026-06-02T12:00:00Z',
                },
            ],
        }
        global.fetch = jest.fn((url: string) => {
            if (url === '/api/portfolio') return response({ data: [product()] })
            if (url === '/api/portfolio/pipe-1') return response({ data: portfolioProduct({ usageSource: source }) })
            if (url === '/api/monitor/pipe-1/usage') return response({ data: usage })
            if (url === '/api/portfolio/pipe-1/revenue') return response({ data: emptyRevenue })
            if (url === '/api/monitor/pipe-1/errors') return response({ data: emptyErrors })
            if (url === '/api/monitor/pipe-1/correlation') return response({ data: emptyCorrelation })
            if (url === '/api/monitor/pipe-1/alert-settings') return response({ data: emptyAlertSettings })
            return response({ error: 'not found' }, false)
        }) as unknown as typeof fetch

        render(<MonitorDashboard initialPipelineId="pipe-1" view="usage" />)

        expect(await screen.findByRole('heading', { name: 'Usage' })).toBeInTheDocument()
        expect(screen.getByText('3 visitors and 1 signups over the last 14 days.')).toBeInTheDocument()
        expect(screen.getByText('Recent events')).toBeInTheDocument()
        expect(screen.getByText('signup')).toBeInTheDocument()
        expect(screen.queryByText('Usage setup')).not.toBeInTheDocument()
        expect(screen.queryByText('Package option')).not.toBeInTheDocument()
    })

    it('syncs connected revenue from the portfolio dashboard', async () => {
        const connectedRevenueSource = {
            ...revenueSource,
            status: 'connected',
            providerAccountId: 'acct_123',
            providerAccountLabel: 'acct_123',
            currentMrrCents: 12000,
            newCustomers30d: 2,
            churnedCustomers30d: 1,
            churnRate30d: 0.25,
            connectedAt: '2026-06-01T00:00:00Z',
            lastSyncedAt: null,
        }
        const revenue = {
            source: connectedRevenueSource,
            connected: true,
            summary: {
                mrrCents: 12000,
                newCustomers30d: 2,
                churnedCustomers30d: 1,
                churnRate30d: 0.25,
            },
        }
        const syncedRevenue = {
            source: { ...connectedRevenueSource, lastSyncedAt: '2026-06-02T12:00:00Z' },
            connected: true,
            summary: {
                mrrCents: 15000,
                newCustomers30d: 3,
                churnedCustomers30d: 1,
                churnRate30d: 0.2,
            },
        }
        global.fetch = jest.fn((url: string, init?: RequestInit) => {
            if (url === '/api/portfolio/pipe-1/revenue/sync' && init?.method === 'POST') {
                return response({ data: syncedRevenue })
            }
            if (url === '/api/portfolio') return response({ data: [product()] })
            if (url === '/api/portfolio/pipe-1') return response({ data: portfolioProduct({ usageSource: source, revenueSource: connectedRevenueSource }) })
            if (url === '/api/monitor/pipe-1/usage') return response({ data: { ...emptyUsage, source, connected: true } })
            if (url === '/api/portfolio/pipe-1/revenue') return response({ data: revenue })
            if (url === '/api/monitor/pipe-1/errors') return response({ data: emptyErrors })
            if (url === '/api/monitor/pipe-1/correlation') return response({ data: emptyCorrelation })
            if (url === '/api/monitor/pipe-1/alert-settings') return response({ data: emptyAlertSettings })
            return response({ error: 'not found' }, false)
        }) as unknown as typeof fetch

        render(<MonitorDashboard initialPipelineId="pipe-1" view="revenue" />)

        fireEvent.click(await screen.findByRole('button', { name: 'Sync revenue' }))

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/portfolio/pipe-1/revenue/sync', { method: 'POST' })
        })
    })

    it('shows sync errors without clearing existing revenue', async () => {
        const connectedRevenueSource = {
            ...revenueSource,
            status: 'connected',
            providerAccountId: 'acct_123',
            providerAccountLabel: 'acct_123',
            currentMrrCents: 12000,
            newCustomers30d: 2,
            churnedCustomers30d: 1,
            churnRate30d: 0.25,
            connectedAt: '2026-06-01T00:00:00Z',
            lastSyncedAt: '2026-06-02T12:00:00Z',
        }
        const revenue = {
            source: connectedRevenueSource,
            connected: true,
            summary: {
                mrrCents: 12000,
                newCustomers30d: 2,
                churnedCustomers30d: 1,
                churnRate30d: 0.25,
            },
        }
        global.fetch = jest.fn((url: string, init?: RequestInit) => {
            if (url === '/api/portfolio/pipe-1/revenue/sync' && init?.method === 'POST') {
                return response({ detail: 'Could not sync Stripe revenue' }, false)
            }
            if (url === '/api/portfolio') return response({ data: [product()] })
            if (url === '/api/portfolio/pipe-1') return response({ data: portfolioProduct({ usageSource: source, revenueSource: connectedRevenueSource }) })
            if (url === '/api/monitor/pipe-1/usage') return response({ data: { ...emptyUsage, source, connected: true } })
            if (url === '/api/portfolio/pipe-1/revenue') return response({ data: revenue })
            if (url === '/api/monitor/pipe-1/errors') return response({ data: emptyErrors })
            if (url === '/api/monitor/pipe-1/correlation') return response({ data: emptyCorrelation })
            if (url === '/api/monitor/pipe-1/alert-settings') return response({ data: emptyAlertSettings })
            return response({ error: 'not found' }, false)
        }) as unknown as typeof fetch

        render(<MonitorDashboard initialPipelineId="pipe-1" view="revenue" />)

        fireEvent.click(await screen.findByRole('button', { name: 'Sync revenue' }))

        expect(await screen.findByText('Sync failed: Could not sync Stripe revenue')).toBeInTheDocument()
        expect(screen.getByText('$120')).toBeInTheDocument()
    })

    it('saves product URL and allowed domain setup', async () => {
        const usage = {
            ...emptyUsage,
            source,
            connected: true,
        }
        global.fetch = jest.fn((url: string, init?: RequestInit) => {
            if (url === '/api/monitor/pipe-1/usage-source' && init?.method === 'PATCH') {
                return response({ data: { ...source, productUrl: 'https://new.example', allowedDomain: 'new.example' } })
            }
            if (url === '/api/portfolio') return response({ data: [product()] })
            if (url === '/api/portfolio/pipe-1') return response({ data: portfolioProduct({ usageSource: source }) })
            if (url === '/api/monitor/pipe-1/usage') return response({ data: usage })
            if (url === '/api/portfolio/pipe-1/revenue') return response({ data: emptyRevenue })
            if (url === '/api/monitor/pipe-1/errors') return response({ data: emptyErrors })
            if (url === '/api/monitor/pipe-1/correlation') return response({ data: emptyCorrelation })
            if (url === '/api/monitor/pipe-1/alert-settings') return response({ data: emptyAlertSettings })
            return response({ error: 'not found' }, false)
        }) as unknown as typeof fetch

        render(<MonitorSetupDashboard />)

        const productUrl = await screen.findByLabelText('Product URL')
        fireEvent.change(productUrl, { target: { value: 'https://new.example' } })
        fireEvent.change(screen.getByLabelText('Allowed domain'), { target: { value: 'new.example' } })
        fireEvent.click(screen.getByRole('button', { name: 'Save setup' }))

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/monitor/pipe-1/usage-source', expect.objectContaining({
                method: 'PATCH',
                body: JSON.stringify({
                    product_url: 'https://new.example',
                    allowed_domain: 'new.example',
                }),
            }))
        })
    })

    it('starts the Stripe connection flow from setup', async () => {
        const usage = {
            ...emptyUsage,
            source,
            connected: true,
        }
        global.fetch = jest.fn((url: string, init?: RequestInit) => {
            if (url === '/api/portfolio/pipe-1/revenue-source/connect' && init?.method === 'POST') {
                return response({ data: { url: 'https://connect.stripe.com/oauth/authorize?state=state-123' } })
            }
            if (url === '/api/portfolio') return response({ data: [product()] })
            if (url === '/api/portfolio/pipe-1') return response({ data: portfolioProduct({ usageSource: source }) })
            if (url === '/api/monitor/pipe-1/usage') return response({ data: usage })
            if (url === '/api/portfolio/pipe-1/revenue') return response({ data: emptyRevenue })
            if (url === '/api/monitor/pipe-1/errors') return response({ data: emptyErrors })
            if (url === '/api/monitor/pipe-1/correlation') return response({ data: emptyCorrelation })
            if (url === '/api/monitor/pipe-1/alert-settings') return response({ data: emptyAlertSettings })
            return response({ error: 'not found' }, false)
        }) as unknown as typeof fetch

        render(<MonitorSetupDashboard />)

        fireEvent.click(await screen.findByRole('button', { name: 'Revenue' }))
        fireEvent.click(await screen.findByRole('button', { name: 'Connect Stripe' }))

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/portfolio/pipe-1/revenue-source/connect', expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ provider: 'stripe' }),
            }))
        })
        expect(mockAssign).toHaveBeenCalledWith('https://connect.stripe.com/oauth/authorize?state=state-123')
        expect(screen.queryByText('MRR')).not.toBeInTheDocument()
        expect(screen.queryByText('Churned customers')).not.toBeInTheDocument()
    })
})
