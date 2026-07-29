import { searchDraftChips } from '@/lib/types/search'

describe('searchDraftChips', () => {
    it('renders the validated search draft as user-readable confirmation filters', () => {
        const labels = searchDraftChips({
            query: 'invoice delays',
            opportunity_domains: ['fintech'],
            opportunity_types: ['software'],
            sources: ['reddit'],
            communities: ['r/freelance'],
            min_posts: 5,
            observed_after: null,
            trending_only: true,
            min_signal_score: 0.75,
            sort: 'signal_score',
            limit: 20,
            offset: 0,
        }).map(chip => chip.label)

        expect(labels).toEqual([
            'Contains: invoice delays',
            'Domain: fintech',
            'Type: software',
            'Source: reddit',
            'Community: r/freelance',
            '5+ posts',
            'Trending only',
            '75%+ signal',
            'Sort: signal score',
        ])
    })
})
