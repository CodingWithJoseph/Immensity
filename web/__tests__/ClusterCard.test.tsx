import { render, screen, fireEvent } from '@testing-library/react'
import ClusterCard, { ClusterCardProps } from '@/components/clusters/ClusterCard'

const baseCluster: ClusterCardProps['cluster'] = {
    id: '42',
    name: 'Freelance invoicing pain',
    summary: 'Freelancers struggle to collect and reconcile invoices.',
    opportunity_type: 'workflow',
    opportunity_domain: 'finance',
    post_count: 12,
    trending: true,
    last_seen_date: '2026-05-20T00:00:00Z',
    sources: ['reddit'],
    sample_posts: [
        { id: 'p1', title: 'Chasing invoices all week' },
        { id: 'p2', title: 'Reconciliation is painful' },
        { id: 'p3', title: 'I pay for three apps' },
    ],
    is_watched: false,
}

describe('ClusterCard', () => {
    it('renders cluster name, summary and post count', () => {
        render(<ClusterCard cluster={baseCluster} mode="authenticated" />)
        expect(screen.getByText('Freelance invoicing pain')).toBeInTheDocument()
        expect(screen.getByText('Freelancers struggle to collect and reconcile invoices.')).toBeInTheDocument()
        expect(screen.getByText('12 posts')).toBeInTheDocument()
    })

    it('shows + Watch in authenticated mode when not watched and fires onWatch', () => {
        const onWatch = jest.fn()
        render(<ClusterCard cluster={baseCluster} mode="authenticated" onWatch={onWatch} />)
        const btn = screen.getByRole('button', { name: '+ Watch' })
        fireEvent.click(btn)
        expect(onWatch).toHaveBeenCalledWith('42')
    })

    it('shows Signals -> when watched and fires onOpenSignals', () => {
        const onOpenSignals = jest.fn()
        render(
            <ClusterCard
                cluster={{ ...baseCluster, is_watched: true }}
                mode="authenticated"
                onOpenSignals={onOpenSignals}
            />,
        )
        const btn = screen.getByRole('button', { name: 'Signals ->' })
        fireEvent.click(btn)
        expect(onOpenSignals).toHaveBeenCalledWith('42')
    })

    it('shows the sign-up CTA in public mode (no watch buttons)', () => {
        render(<ClusterCard cluster={baseCluster} mode="public" />)
        const link = screen.getByText('Sign up to explore ->')
        expect(link).toBeInTheDocument()
        expect(link.getAttribute('href')).toBe('/sign-up')
        expect(screen.queryByRole('button', { name: '+ Watch' })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Signals ->' })).not.toBeInTheDocument()
    })

    it('renders Trending momentum when the cluster is trending', () => {
        render(<ClusterCard cluster={baseCluster} mode="authenticated" />)
        expect(screen.getByText('Trending')).toBeInTheDocument()
    })

    it('renders Steady momentum when the cluster is not trending', () => {
        render(<ClusterCard cluster={{ ...baseCluster, trending: false }} mode="authenticated" />)
        expect(screen.getByText('Steady')).toBeInTheDocument()
    })

    it('hides momentum when trending is null', () => {
        render(<ClusterCard cluster={{ ...baseCluster, trending: null }} mode="authenticated" />)
        expect(screen.queryByText('Trending')).not.toBeInTheDocument()
        expect(screen.queryByText('Steady')).not.toBeInTheDocument()
    })
})
