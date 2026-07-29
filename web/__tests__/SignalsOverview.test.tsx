import { fireEvent, render, screen } from '@testing-library/react'
import SignalOverview from '@/app/(core)/dashboard/(discovery)/discover/signal/SignalOverview'
import type { SignalResponse } from '@/lib/types/signals'

jest.mock('recharts', () => ({
    Area: () => null,
    AreaChart: () => <div data-testid='area-chart' />,
    CartesianGrid: () => null,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Tooltip: () => null,
    XAxis: () => null,
    YAxis: () => null,
}))

const signal: SignalResponse = {
    clusterId: 42,
    signalScore: 0.91,
    recency: 0.88,
    momentum7d: 0.2,
    momentum30d: 0.4,
    momentum90d: null,
    totalPosts: 12,
    authorCount: 8,
    communityCount: 3,
    platformCount: 1,
    sourceCommunities: ['r/freelance', 'r/bookkeeping'],
    avgComments: 6.5,
    avgVotes: 42,
    postVolumeByWeek: [
        { week: '2026-W20', count: 4 },
        { week: '2026-W21', count: 7 },
    ],
    topProblemStatements: [
        { problem_statement: 'Freelancers waste hours chasing unpaid invoices.' },
    ],
    status: 'ready',
    generatedAt: '2026-05-21T00:00:00Z',
    mode: 'active',
    completeness: 0.875,
}

describe('Signals overview', () => {
    it('renders a visual dashboard from the flat signal response', () => {
        const onViewEvidence = jest.fn()
        render(<SignalOverview signal={signal} onViewEvidence={onViewEvidence} />)

        expect(screen.getAllByText('Ready').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Active signal').length).toBeGreaterThan(0)
        expect(screen.getByText('Signal score')).toBeInTheDocument()
        expect(screen.getByText('91')).toBeInTheDocument()
        expect(screen.getAllByText('Momentum').length).toBeGreaterThan(0)
        expect(screen.getByTestId('area-chart')).toBeInTheDocument()
        expect(screen.getByText('Source mix')).toBeInTheDocument()
        expect(screen.getByText('r/freelance')).toBeInTheDocument()
        expect(screen.getByText('Top problem statements')).toBeInTheDocument()
        expect(screen.getByText('Freelancers waste hours chasing unpaid invoices.')).toBeInTheDocument()
        expect(screen.getByText('Data quality')).toBeInTheDocument()
        // platformCount is now surfaced.
        expect(screen.getByText('Platforms')).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'View posts' }))
        expect(onViewEvidence).toHaveBeenCalledTimes(1)
    })

    it('shows the score-card skeleton while loading', () => {
        const { container } = render(<SignalOverview signal={null} loading />)

        expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
        expect(screen.queryByText('Signal score')).not.toBeInTheDocument()
        expect(screen.queryByText('91')).not.toBeInTheDocument()
    })

    it('shows an empty state instead of an empty chart when there is no weekly volume', () => {
        render(<SignalOverview signal={{ ...signal, postVolumeByWeek: [] }} />)

        expect(screen.getByText('No weekly data yet')).toBeInTheDocument()
        expect(screen.queryByTestId('area-chart')).not.toBeInTheDocument()
    })

    it('handles null weekly volume the same as empty', () => {
        render(<SignalOverview signal={{ ...signal, postVolumeByWeek: null }} />)

        expect(screen.getByText('No weekly data yet')).toBeInTheDocument()
        expect(screen.queryByTestId('area-chart')).not.toBeInTheDocument()
    })

    it('shows an empty state when there are no problem statements', () => {
        render(<SignalOverview signal={{ ...signal, topProblemStatements: [] }} />)

        expect(screen.getByText('No problem statements yet')).toBeInTheDocument()
    })

    it('hides the source mix entirely when there are no source communities', () => {
        render(<SignalOverview signal={{ ...signal, sourceCommunities: [] }} />)
        expect(screen.queryByText('Source mix')).not.toBeInTheDocument()

        render(<SignalOverview signal={{ ...signal, sourceCommunities: null }} />)
        expect(screen.queryByText('Source mix')).not.toBeInTheDocument()
    })

    it('renders data quality from the completeness fraction', () => {
        render(<SignalOverview signal={signal} />)
        expect(screen.getByText('88% complete')).toBeInTheDocument()
    })
})
