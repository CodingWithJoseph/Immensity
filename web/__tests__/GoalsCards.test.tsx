import { render, screen, waitFor } from '@testing-library/react'
import { GoalRow, MilestoneLog, AccountGoalsCard } from '@/app/(core)/dashboard/components/GoalsCards'
import type { Goal } from '@/lib/types/goals'

jest.mock('@/lib/fetchJson', () => ({ fetchJson: jest.fn() }))
import { fetchJson } from '@/lib/fetchJson'

function goal(over: Partial<Goal>): Goal {
    return {
        id: 'proj_signups', category: 'growth', title: 'Signups', metricKey: 'signups', icon: 'user-plus',
        currentValue: 12, achievedCount: 2, tierCount: 6, maxThreshold: 1000, state: 'active',
        tiers: [
            { tierIndex: 0, threshold: 5, label: '5', achieved: true, state: 'completed', estimateDays: 21, activatedAt: '2026-05-01T00:00:00Z', targetDate: '2026-05-22T00:00:00Z', completedAt: '2026-06-01T00:00:00Z', daysLeft: null },
            { tierIndex: 1, threshold: 10, label: '10', achieved: true, state: 'completed', estimateDays: 30, activatedAt: '2026-06-01T00:00:00Z', targetDate: '2026-07-01T00:00:00Z', completedAt: '2026-06-10T00:00:00Z', daysLeft: null },
            { tierIndex: 2, threshold: 50, label: '50', achieved: false, state: 'active', estimateDays: 60, activatedAt: '2026-06-10T00:00:00Z', targetDate: '2026-08-09T00:00:00Z', completedAt: null, daysLeft: 30 },
        ],
        nextTier: { tierIndex: 2, threshold: 50, label: '50' },
        activeTier: { tierIndex: 2, threshold: 50, label: '50', estimateDays: 60, activatedAt: '2026-06-10T00:00:00Z', targetDate: '2026-08-09T00:00:00Z', daysLeft: 30 },
        activatedAt: '2026-06-10T00:00:00Z', targetDate: '2026-08-09T00:00:00Z',
        milestones: [
            { tierIndex: 0, label: '5', threshold: 5, achievedAt: '2026-06-01T00:00:00Z', activatedAt: '2026-05-01T00:00:00Z', targetDate: '2026-05-22T00:00:00Z' },
            { tierIndex: 1, label: '10', threshold: 10, achievedAt: '2026-06-10T00:00:00Z', activatedAt: '2026-06-01T00:00:00Z', targetDate: '2026-07-01T00:00:00Z' },
        ],
        ...over,
    }
}

describe('GoalRow', () => {
    it('shows a friendly label and a percentage toward the next tier', () => {
        const { container } = render(<GoalRow goal={goal({})} />)
        // "Signups" is presented as the clearer "New signups".
        expect(screen.getByText('New signups')).toBeInTheDocument()
        expect(screen.getByText('24%')).toBeInTheDocument() // 12 / 50
        const fill = container.querySelector('.pf-bar-fill') as HTMLElement
        expect(fill).toBeInTheDocument()
        expect(fill.style.width).toBe('24%')
        expect(fill).toHaveClass('bg-(--color-blue)')
    })

    it('shows product setup as a percentage of its steps', () => {
        render(<GoalRow goal={goal({
            id: 'proj_setup', metricKey: 'setup_steps', currentValue: 2, tierCount: 4,
            nextTier: { tierIndex: 2, threshold: 3, label: '3/4' },
        })} />)
        expect(screen.getByText('Product setup')).toBeInTheDocument()
        expect(screen.getByText('50%')).toBeInTheDocument() // 2 of 4 steps
    })

    it('reports completion when every tier is cleared', () => {
        render(<GoalRow goal={goal({ nextTier: null, tierCount: 6 })} />)
        expect(screen.getByText('Complete')).toBeInTheDocument()
    })
})

describe('MilestoneLog', () => {
    it('lists achieved milestones with dates, most recent first', () => {
        const { container } = render(<MilestoneLog goals={[goal({})]} />)
        const items = container.querySelectorAll('li')
        expect(items).toHaveLength(2)
        // Newest first: the tier-10 milestone (2026-06-10) precedes tier-5 (2026-06-01).
        expect(items[0]).toHaveTextContent('Signups · 10')
        expect(items[1]).toHaveTextContent('Signups · 5')
    })

    it('renders nothing when there are no milestones', () => {
        const { container } = render(<MilestoneLog goals={[goal({ milestones: [] })]} />)
        expect(container.firstChild).toBeNull()
    })
})

describe('AccountGoalsCard', () => {
    it('fetches and renders account goal rows', async () => {
        (fetchJson as jest.Mock).mockResolvedValue({ data: [goal({ metricKey: 'products_launched', id: 'acct_launches' })] })
        render(<AccountGoalsCard />)
        expect(await screen.findByText('Products launched')).toBeInTheDocument()
        expect(fetchJson).toHaveBeenCalledWith('/api/portfolio/goals')
    })

    it('shows an empty state when there are no goals', async () => {
        (fetchJson as jest.Mock).mockResolvedValue({ data: [] })
        render(<AccountGoalsCard />)
        await waitFor(() => expect(screen.getByText(/portfolio goals/i)).toBeInTheDocument())
    })
})
