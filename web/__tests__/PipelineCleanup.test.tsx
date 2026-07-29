import { render, screen } from '@testing-library/react'
import PipelineCardItem from '@/app/(core)/dashboard/(manage)/manage/pipeline/PipelineCardItem'
import { STAGES } from '@/app/(core)/dashboard/(manage)/manage/pipeline/constants'
import type { PipelineCard } from '@/lib/types/cluster'

function makeCard(overrides: Partial<PipelineCard> = {}): PipelineCard {
    return {
        id: 'pipe-1',
        name: 'PC boot failures',
        teamId: null,
        team: null,
        postIds: ['1', '2'],
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

describe('Pipeline cleanup', () => {
    it('uses the project lifecycle as the board stages', () => {
        expect(STAGES).toEqual([
            { id: 'watching', label: 'Watching' },
            { id: 'building', label: 'Building' },
            { id: 'launched', label: 'Launched' },
        ])
        expect(STAGES.map(stage => stage.label)).not.toContain('Market Research')
        expect(STAGES.map(stage => stage.label)).not.toContain('Validate')
    })

    it('preserves useful card descriptions without adding placeholder copy', () => {
        const { rerender } = render(
            <PipelineCardItem
                card={makeCard({ notes: 'AI-generated opportunity summary', killCriteria: 'Stop after two weeks' })}
                onClick={jest.fn()}
            />,
        )

        expect(screen.getByText('AI-generated opportunity summary')).toBeInTheDocument()
        expect(screen.queryByText('Stop if: Stop after two weeks')).not.toBeInTheDocument()

        rerender(<PipelineCardItem card={makeCard({ notes: null, killCriteria: 'Stop after two weeks' })} onClick={jest.fn()} />)

        expect(screen.getByText('Stop if: Stop after two weeks')).toBeInTheDocument()
        expect(screen.queryByText('Click to manage')).not.toBeInTheDocument()
        expect(screen.queryByText('No kill criteria set')).not.toBeInTheDocument()
    })

    it('shows only separate issue and kill criteria chips', () => {
        render(<PipelineCardItem card={makeCard({
            openIssueCount: 3,
            openKillCriteriaCount: 2,
            team: { id: 'team-1', name: 'Growth', description: null },
        })} onClick={jest.fn()} />)

        expect(screen.getByText('3 issues')).toBeInTheDocument()
        expect(screen.getByText('2 kill criteria')).toBeInTheDocument()
        expect(screen.getByText('3 issues').parentElement).toHaveClass('border-0', 'bg-[var(--chip-warning-bg)]', 'text-[var(--chip-warning-text)]')
        expect(screen.getByText('2 kill criteria').parentElement).toHaveClass('border-0', 'bg-[var(--chip-neutral-bg)]', 'text-[var(--chip-neutral-text)]')
        expect(screen.queryByText(/3 issues \/ 2 kill criteria/)).not.toBeInTheDocument()
        expect(screen.queryByText('Growth')).not.toBeInTheDocument()
    })

    it('keeps zero-value chips visible and easy to scan', () => {
        render(<PipelineCardItem card={makeCard()} onClick={jest.fn()} />)

        expect(screen.getByText('0 issues')).toBeInTheDocument()
        expect(screen.getByText('0 kill criteria')).toBeInTheDocument()
        expect(screen.getByText('0 issues').parentElement).toHaveClass('border-0', 'bg-[var(--chip-neutral-bg)]', 'text-[var(--chip-neutral-text)]')
        expect(screen.getByText('0 kill criteria').parentElement).toHaveClass('border-0', 'bg-[var(--chip-warning-bg)]', 'text-[var(--chip-warning-text)]')
    })

    it('uses the blue progress color in every lifecycle stage', () => {
        const { container, rerender } = render(<PipelineCardItem card={makeCard({
            stage: 'watching',
            timelineDays: 60,
            timelineStart: '2026-05-01T00:00:00Z',
        })} onClick={jest.fn()} />)

        expect(container.querySelector('.pf-bar-fill')).toHaveClass('bg-(--color-blue)')

        rerender(<PipelineCardItem card={makeCard({
            stage: 'building',
            timelineDays: 60,
            timelineStart: '2026-05-01T00:00:00Z',
        })} onClick={jest.fn()} />)

        expect(container.querySelector('.pf-bar-fill')).toHaveClass('bg-(--color-blue)')
    })
})
