import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import ClusterPicker from '@/app/(core)/dashboard/(discovery)/discover/signal/ClusterPicker'
import SignalHeader from '@/app/(core)/dashboard/(discovery)/discover/signal/SignalHeader'
import SignalPageClient from '@/app/(core)/dashboard/(discovery)/discover/signal/SignalPageClient'
import Sidebar from '@/app/(core)/dashboard/components/Sidebar'
import { SidebarProvider } from '@/app/(core)/dashboard/contexts/SidebarContext'
import type { PipelineCard } from '@/lib/types/cluster'
import type { SignalWorkspace } from '@/lib/types/signals'

const mockPush = jest.fn()
let mockPathname = '/dashboard/discover/signal'
let mockSearchParams = 'pipelineId=pipe-1'

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
    usePathname: () => mockPathname,
    useSearchParams: () => new URLSearchParams(mockSearchParams),
}))

jest.mock('@/lib/services/auth', () => ({
    signOut: jest.fn(),
}))

jest.mock('react-hot-toast', () => ({
    __esModule: true,
    default: { success: jest.fn(), error: jest.fn() },
}))

const workspace: SignalWorkspace = {
    pipeline: {
        id: 'pipe-1',
        name: 'Freelance invoicing',
        notes: null,
        sourceClusterId: '42',
        stage: 'watching',
    },
    cluster: {
        id: 42,
        name: 'Late freelance payments',
        summary: 'Freelancers struggle to reconcile and collect client payments.',
        opportunityType: null,
        opportunityDomain: null,
        postCount: 3,
        commentCount: 12,
        averageUpvoteRatio: null,
        persistenceScore: null,
        intraClusterDensity: null,
        silhouetteScore: null,
        authorCount: null,
        communityCount: null,
        trending: null,
        dateRange: { from: null, to: null },
    },
    metrics: { postCount: 3, avgSourceScore: null, commentCount: 12, averageUpvoteRatio: null },
    analytics: { sourceBreakdown: [], topTerms: [], postVolumeByDate: [] },
    availability: { clusterAnalytics: true },
}

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 400) {
    return Promise.resolve({
        ok,
        status,
        json: async () => body,
        text: async () => JSON.stringify(body),
    } as Response)
}

function pipelineCard(): PipelineCard {
    return {
        id: 'pipe-1',
        name: 'Freelance invoicing',
        teamId: null,
        team: null,
        postIds: ['post-1'],
        sourceClusterId: '42',
        stage: 'validating',
        killCriteria: null,
        distributionChannels: [],
        clusterMetrics: null,
        posts: [],
        launchedAt: null,
        removedAt: null,
        createdAt: '2026-05-01T00:00:00Z',
        updatedAt: '2026-05-01T00:00:00Z',
        openIssueCount: 0,
        openKillCriteriaCount: 0,
    }
}

beforeEach(() => {
    mockPush.mockReset()
    mockPathname = '/dashboard/discover/signal'
    mockSearchParams = 'pipelineId=pipe-1'
    localStorage.clear()
})

describe('Pipeline-anchored Signals', () => {
    it('uses active pipeline cards in the picker and navigates with pipelineId', async () => {
        global.fetch = jest.fn().mockResolvedValue(jsonResponse({ data: [pipelineCard()] })) as unknown as typeof fetch

        render(<ClusterPicker />)
        fireEvent.click(await screen.findByRole('button', { name: /Freelance invoicing/i }))

        expect(mockPush).toHaveBeenCalledWith('/dashboard/discover/signal?pipelineId=pipe-1')
    })

    it('shows the unavailable state with status and retry for a 503', async () => {
        global.fetch = jest.fn((url: string | URL | Request) => {
            const href = String(url)
            if (href.includes('/signal')) {
                return jsonResponse({ error: 'unavailable' }, false, 503)
            }
            return jsonResponse({ data: [] })
        }) as unknown as typeof fetch

        render(<SignalPageClient />)

        expect(await screen.findByText('Signal data unavailable')).toBeInTheDocument()
        expect(screen.getByText(/returned 503/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    })

    it('shows the unavailable state for a 404 signal response', async () => {
        global.fetch = jest.fn((url: string | URL | Request) => {
            const href = String(url)
            if (href.includes('/signal')) {
                return jsonResponse({ error: 'missing' }, false, 404)
            }
            return jsonResponse({ data: [] })
        }) as unknown as typeof fetch

        render(<SignalPageClient />)

        expect(await screen.findByText('Signal data unavailable')).toBeInTheDocument()
        expect(screen.getByText(/No signal has been published/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    })

    it('renders the section nav and the active section submenu in order', () => {
        mockPathname = '/dashboard/manage/pipeline'
        render(<SidebarProvider><Sidebar /></SidebarProvider>)

        // Dashboard is now reached via the Immensity wordmark (outside this nav),
        // and Market is a non-clickable "coming soon" item, so neither is a link here.
        const sectionNav = screen.getByRole('navigation', { name: 'Dashboard sections' })
        expect(within(sectionNav).getAllByRole('link').map(link => link.textContent)).toEqual([
            'Build', 'Manage', 'Monitor',
        ])
        expect(within(sectionNav).getByRole('link', { name: 'Monitor' })).toHaveAttribute('href', '/dashboard/monitor/command-center')
        // Category dots were removed from the top nav — the section labels stand alone.
        expect(sectionNav.querySelectorAll('[data-feature-category]')).toHaveLength(0)

        const submenu = screen.getByRole('complementary', { name: 'Dashboard submenu' })
        const subLinks = within(submenu).getAllByRole('link').map(link => ({
            name: link.textContent,
            href: link.getAttribute('href'),
            active: link.getAttribute('aria-current'),
        }))
        expect(subLinks).toEqual([
            { name: 'Pipeline', href: '/dashboard/manage/pipeline', active: 'page' },
            { name: 'Portfolio', href: '/dashboard/manage/portfolio', active: null },
            { name: 'Goals', href: '/dashboard/manage/goals', active: null },
            { name: 'Timeline', href: '/dashboard/manage/calendar', active: null },
            { name: 'Teams', href: '/dashboard/manage/teams', active: null },
            { name: 'Issues', href: '/dashboard/manage/issues', active: null },
        ])
    })

    it('marks the active sub-item while keeping the section nav available', () => {
        mockPathname = '/dashboard/manage/issues'
        render(<SidebarProvider><Sidebar /></SidebarProvider>)

        const submenu = screen.getByRole('complementary', { name: 'Dashboard submenu' })
        expect(within(submenu).getByRole('link', { name: 'Issues' })).toHaveAttribute('aria-current', 'page')

        const sectionNav = screen.getByRole('navigation', { name: 'Dashboard sections' })
        expect(within(sectionNav).getByRole('link', { name: 'Build' })).toBeInTheDocument()
        expect(within(sectionNav).getByRole('link', { name: 'Manage' })).toBeInTheDocument()
    })

    it('shows only the active section in the submenu', () => {
        mockPathname = '/dashboard/build/breakdown'
        render(<SidebarProvider><Sidebar /></SidebarProvider>)

        const submenu = screen.getByRole('complementary', { name: 'Dashboard submenu' })
        expect(within(submenu).getByRole('link', { name: 'Breakdown' })).toHaveAttribute('aria-current', 'page')
        expect(within(submenu).getByRole('link', { name: 'Tasks' })).toBeInTheDocument()
        // Manage items are not shown while the Build section is active.
        expect(within(submenu).queryByRole('link', { name: 'Pipeline' })).not.toBeInTheDocument()
    })

    it('exposes an account menu with settings and sign out', () => {
        render(<SidebarProvider><Sidebar /></SidebarProvider>)

        fireEvent.click(screen.getByRole('button', { name: 'Account menu' }))
        expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    })

    it('does not render a Move to Research action in the header', () => {
        render(<SignalHeader workspace={workspace} collapsed={false} onToggleCollapsed={jest.fn()} />)
        expect(screen.queryByRole('button', { name: 'Move to Research' })).not.toBeInTheDocument()
    })

    it('keeps removal in the compact header overflow menu', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({}),
        }) as unknown as typeof fetch

        render(<SignalHeader workspace={{ ...workspace, pipeline: { ...workspace.pipeline, stage: 'validating' } }} collapsed={false} onToggleCollapsed={jest.fn()} />)

        expect(screen.queryByRole('button', { name: 'Move to Research' })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Remove from Pipeline' })).not.toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Signal actions' }))
        fireEvent.click(screen.getByRole('button', { name: 'Remove from Pipeline' }))

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/pipeline/pipe-1', { method: 'DELETE' })
            expect(mockPush).toHaveBeenCalledWith('/dashboard/discover/signal')
        })
    })
})
