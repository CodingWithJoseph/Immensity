import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import TeamsPage from '@/app/(core)/dashboard/(manage)/manage/teams/page'
import type { Team } from '@/lib/types/team'

function response(body: unknown, ok = true) {
    return Promise.resolve({
        ok,
        status: ok ? 200 : 400,
        text: () => Promise.resolve(JSON.stringify(body)),
    } as Response)
}

function team(overrides: Partial<Team> = {}): Team {
    return {
        id: 'team-1',
        ownerUserId: 'test-uid',
        name: 'Launch Lab',
        description: 'Research together',
        role: 'owner',
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-02T00:00:00Z',
        members: [
            { id: 'member-owner', teamId: 'team-1', userId: 'test-uid', email: null, displayName: 'Joseph', role: 'owner', status: 'active', createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z' },
        ],
        ...overrides,
    }
}

function setViewport(isDesktop: boolean) {
    window.matchMedia = ((query: string) => ({
        matches: isDesktop,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
}

afterEach(() => {
    jest.clearAllMocks()
    setViewport(false)
})

describe('TeamsPage', () => {
    it('shows the empty state with a Create team action', async () => {
        global.fetch = jest.fn(() => response({ data: [] })) as unknown as typeof fetch
        render(<TeamsPage />)
        expect(await screen.findByText('No teams yet')).toBeInTheDocument()
        expect(screen.getAllByRole('button', { name: /Create team/ }).length).toBeGreaterThan(0)
    })

    it('renders team cards with name, created date and member count', async () => {
        global.fetch = jest.fn(() => response({ data: [team()] })) as unknown as typeof fetch
        render(<TeamsPage />)
        expect(await screen.findByRole('heading', { name: 'Launch Lab' })).toBeInTheDocument()
        expect(screen.getByText(/Created Jun 1, 2026/)).toBeInTheDocument()
        expect(screen.getByText('1 member')).toBeInTheDocument()
    })

    it('creates a team through the two-step modal and shows its card', async () => {
        const created = team({ id: 'team-9', name: 'Growth', members: [] })
        global.fetch = jest.fn((url: string, init?: RequestInit) => {
            if (url === '/api/teams' && init?.method === 'POST') return response({ data: created })
            return response({ data: [] }) // list (initial + reload)
        }) as unknown as typeof fetch

        render(<TeamsPage />)
        fireEvent.click((await screen.findAllByRole('button', { name: /Create team/ }))[0])

        const dialog = screen.getByRole('dialog', { name: 'Create team' })
        fireEvent.change(within(dialog).getByLabelText('Team name'), { target: { value: 'Growth' } })
        fireEvent.click(within(dialog).getByRole('button', { name: 'Create team' }))

        // Same modal transitions to step 2 (Invite members) with the new team name.
        const step2 = await screen.findByRole('dialog', { name: 'Invite members' })
        expect(within(step2).getByText('Growth')).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
        await waitFor(() => expect(screen.getByRole('heading', { name: 'Growth' })).toBeInTheDocument())
        expect(global.fetch).toHaveBeenCalledWith('/api/teams', expect.objectContaining({ method: 'POST' }))
    })

    it('auto-selects the newest team in a persistent pane on desktop', async () => {
        setViewport(true)
        const older = team({ id: 'team-old', name: 'Older Team', createdAt: '2026-06-01T00:00:00Z' })
        const newer = team({ id: 'team-new', name: 'Newer Team', createdAt: '2026-06-20T00:00:00Z', description: 'The newest crew' })
        global.fetch = jest.fn((url: string) => {
            if (url === '/api/teams') return response({ data: [older, newer] })
            if (url === '/api/teams/team-new') return response({ data: newer })
            if (url === '/api/teams/team-old') return response({ data: older })
            if (url === '/api/pipeline') return response({ data: [] })
            return response({})
        }) as unknown as typeof fetch

        render(<TeamsPage />)

        // Both teams listed; the newest team's detail auto-loads inline (no overlay).
        expect(await screen.findByRole('heading', { name: 'Newer Team' })).toBeInTheDocument()
        expect(await screen.findByText('The newest crew')).toBeInTheDocument()
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(document.querySelector('div.fixed.inset-0')).not.toBeInTheDocument()

        // Selecting the older team swaps the pane in place, without opening an overlay.
        fireEvent.click(screen.getByRole('heading', { name: 'Older Team' }))
        expect(await screen.findByText('Research together')).toBeInTheDocument()
        await waitFor(() => expect(screen.queryByText('The newest crew')).not.toBeInTheDocument())
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('opens the details drawer when a card is clicked', async () => {
        global.fetch = jest.fn((url: string) => {
            if (url === '/api/teams') return response({ data: [team()] })
            if (url === '/api/teams/team-1') return response({ data: team() })
            if (url === '/api/pipeline') return response({ data: [] })
            return response({})
        }) as unknown as typeof fetch

        render(<TeamsPage />)
        fireEvent.click(await screen.findByRole('heading', { name: 'Launch Lab' }))

        const drawer = await screen.findByRole('dialog', { name: 'Launch Lab details' })
        expect((await within(drawer).findAllByText('Joseph')).length).toBeGreaterThan(0)
        expect(within(drawer).getAllByText('Owner').length).toBeGreaterThan(0)
    })
})
