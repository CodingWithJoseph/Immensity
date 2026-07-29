
import { render, screen } from '@testing-library/react'
import PipelineActivityColumn from '@/app/(core)/dashboard/components/columns/PipelineActivityColumn'
import PipelineProgressCard from '@/app/(core)/dashboard/components/PipelineProgressCard'
import { PipelineCard } from '@/lib/types/cluster'

function makeCard(overrides: Partial<PipelineCard> = {}): PipelineCard {
    return {
        id: 'pipe-1',
        name: 'Invoicing',
        teamId: null,
        team: null,
        postIds: ['1', '2', '3', '4'],
        sourceClusterId: '42',
        stage: 'validating',
        killCriteria: null,
        distributionChannels: [],
        clusterMetrics: null,
        posts: [],
        launchedAt: null,
        removedAt: null,
        createdAt: '2026-05-01T00:00:00Z',
        updatedAt: '2026-05-10T00:00:00Z',
        openIssueCount: 0,
        openKillCriteriaCount: 0,
        ...overrides,
    }
}

describe('PipelineProgressCard', () => {
    it('shows the card name, post count and humanised stage', () => {
        render(<PipelineProgressCard card={makeCard()} />)
        expect(screen.getByText('Invoicing')).toBeInTheDocument()
        expect(screen.getByText('4 posts')).toBeInTheDocument()
        expect(screen.getByText('Validating')).toBeInTheDocument()
    })
})

describe('PipelineActivityColumn', () => {
    it('renders the active count and a progress card per pipeline', () => {
        const cards = [makeCard({ id: 'p1', name: 'Alpha' }), makeCard({ id: 'p2', name: 'Beta' })]

        render(<PipelineActivityColumn cards={cards} />)

        expect(screen.getByText('Alpha')).toBeInTheDocument()
        expect(screen.getByText('Beta')).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument()
        expect(screen.getByText('In pipeline')).toBeInTheDocument()
    })

    it('shows an empty state when there are no pipelines', () => {
        render(<PipelineActivityColumn cards={[]} />)

        expect(screen.getByText('No active clusters in your pipeline yet.')).toBeInTheDocument()
    })
})
