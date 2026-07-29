import { render, screen, waitFor } from '@testing-library/react'
import { GettingStartedCard, GettingStartedNextHint } from '@/app/(core)/dashboard/components/GettingStarted'
import type { GettingStarted } from '@/lib/types/gettingStarted'

jest.mock('@/lib/fetchJson', () => ({ fetchJson: jest.fn() }))
import { fetchJson } from '@/lib/fetchJson'

const payload = (over: Partial<GettingStarted> = {}): GettingStarted => ({
    steps: [
        { key: 'save_pipeline', title: 'Save a product idea', description: 'Add a signal.', actionLabel: 'Open the pipeline', routeKey: 'pipeline', done: true },
        { key: 'discover_problem', title: 'Break it into problems', description: 'Turn the idea into problems.', actionLabel: 'Open discovery', routeKey: 'problems', done: false },
        { key: 'create_task', title: 'Turn problems into tasks', description: 'Give a problem a next step.', actionLabel: 'Open tasks', routeKey: 'tasks', done: false },
    ],
    completedCount: 1,
    totalCount: 3,
    complete: false,
    nextStep: { key: 'discover_problem', title: 'Break it into problems', description: 'Turn the idea into problems.', actionLabel: 'Open discovery', routeKey: 'problems' },
    ...over,
})

afterEach(() => jest.clearAllMocks())

describe('GettingStartedCard', () => {
    it('renders the ordered steps and deep-links the next action', async () => {
        (fetchJson as jest.Mock).mockResolvedValue({ data: payload() })
        render(<GettingStartedCard />)

        expect(await screen.findByText('Getting started')).toBeInTheDocument()
        // Every step shows; the next-step link points at its mapped route.
        const link = screen.getByRole('link', { name: /Break it into problems/ })
        expect(link).toHaveAttribute('href', '/dashboard/build/breakdown')
        expect(screen.getByText('Save a product idea')).toBeInTheDocument()
    })

    it('renders nothing once onboarding is complete', async () => {
        (fetchJson as jest.Mock).mockResolvedValue({ data: payload({ complete: true, nextStep: null, completedCount: 3 }) })
        const { container } = render(<GettingStartedCard />)
        await waitFor(() => expect(fetchJson).toHaveBeenCalled())
        expect(container).toBeEmptyDOMElement()
    })
})

describe('GettingStartedNextHint', () => {
    it('shows a compact "do this next" hint linking to the next step', async () => {
        (fetchJson as jest.Mock).mockResolvedValue({ data: payload() })
        render(<GettingStartedNextHint />)

        expect(await screen.findByText('Do this next')).toBeInTheDocument()
        const link = screen.getByRole('link', { name: /Open discovery/ })
        expect(link).toHaveAttribute('href', '/dashboard/build/breakdown')
    })

    it('renders nothing when there is no next step', async () => {
        (fetchJson as jest.Mock).mockResolvedValue({ data: payload({ complete: true, nextStep: null }) })
        const { container } = render(<GettingStartedNextHint />)
        await waitFor(() => expect(fetchJson).toHaveBeenCalled())
        expect(container).toBeEmptyDOMElement()
    })
})
