export const SEARCH_SORTS = ['relevance', 'newest', 'largest', 'trending', 'signal_score'] as const

export type SearchSort = (typeof SEARCH_SORTS)[number]

export interface ClusterSearchDraft {
    query: string | null
    opportunity_domains: string[]
    opportunity_types: string[]
    sources: string[]
    communities: string[]
    min_posts: number
    observed_after: string | null
    trending_only: boolean
    min_signal_score: number | null
    sort: SearchSort
    limit: number
    offset: number
}

export interface SearchFilterOptions {
    opportunity_domains: string[]
    opportunity_types: string[]
    sources: string[]
    communities: string[]
}

export interface SearchInterpretation {
    draft: ClusterSearchDraft
    confirmation: string
    assumptions: string[]
    unsupported: string[]
    clarification_question: string | null
    needs_clarification: boolean
    needs_confirmation: boolean
    fallback_used: boolean
    available_options: SearchFilterOptions
}

export type SearchAgentAction =
    | 'inspect_filter_options'
    | 'prepare_search_draft'
    | 'unsupported_tool'

export type SearchAgentStepOutcome = 'completed' | 'rejected'

export type SearchAgentStopReason =
    | 'confirmation_required'
    | 'clarification_required'
    | 'fallback'
    | 'step_limit'

export interface SearchAgentStep {
    sequence: number
    action: SearchAgentAction
    outcome: SearchAgentStepOutcome
}

export interface SearchAgentResponse extends SearchInterpretation {
    steps: SearchAgentStep[]
    stop_reason: SearchAgentStopReason
}

export interface SearchResultCluster {
    id: number
    name: string | null
    summary: string | null
    signalScore?: number | null
    opportunity_type: string | null
    opportunity_domain: string | null
    problemStatement?: string | null
    post_count: number
    trending_status: string | null
    date_range_start?: string | null
    date_range_end: string | null
    sources?: string[] | null
    subreddits?: string[] | null
    sample_posts?: { id: number | string; title: string | null }[] | null
    is_watched?: boolean
}

export interface SearchQueryResponse {
    data: SearchResultCluster[]
    total: number
    applied_filters: Omit<ClusterSearchDraft, 'limit' | 'offset'>
    pagination: {
        limit: number
        offset: number
        returned: number
        has_more: boolean
        next_offset: number | null
    }
}

export type SearchSessionView = 'recent' | 'saved' | 'archived'

export interface SearchSessionSummary {
    id: string
    title: string
    saved: boolean
    archived: boolean
    expires_at: string | null
    last_activity_at: string
    created_at: string
    updated_at: string
}

export interface SearchSessionTurn {
    id: string
    user_message: string
    interpretation: SearchInterpretation
    created_at: string
}

export interface SearchSessionRun {
    id: string
    draft: ClusterSearchDraft
    result_cluster_ids: string[]
    result_count: number
    created_at: string
}

export interface SearchSessionDetail extends SearchSessionSummary {
    turns: SearchSessionTurn[]
    runs: SearchSessionRun[]
}

export interface SearchFilterChip {
    key: string
    label: string
}

function labelList(prefix: string, values: string[]): string {
    return `${prefix}: ${values.join(', ')}`
}

export function searchDraftChips(draft: ClusterSearchDraft): SearchFilterChip[] {
    const chips: SearchFilterChip[] = []

    if (draft.query) chips.push({ key: 'query', label: `Contains: ${draft.query}` })
    if (draft.opportunity_domains.length) {
        chips.push({ key: 'domains', label: labelList('Domain', draft.opportunity_domains) })
    }
    if (draft.opportunity_types.length) {
        chips.push({ key: 'types', label: labelList('Type', draft.opportunity_types) })
    }
    if (draft.sources.length) chips.push({ key: 'sources', label: labelList('Source', draft.sources) })
    if (draft.communities.length) {
        chips.push({ key: 'communities', label: labelList('Community', draft.communities) })
    }
    if (draft.min_posts > 1) chips.push({ key: 'min-posts', label: `${draft.min_posts}+ posts` })
    if (draft.observed_after) {
        chips.push({
            key: 'observed-after',
            label: `Observed since ${new Date(draft.observed_after).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            })}`,
        })
    }
    if (draft.trending_only) chips.push({ key: 'trending', label: 'Trending only' })
    if (draft.min_signal_score != null) {
        chips.push({ key: 'signal', label: `${Math.round(draft.min_signal_score * 100)}%+ signal` })
    }
    if (draft.sort !== 'relevance') {
        chips.push({ key: 'sort', label: `Sort: ${draft.sort.replace('_', ' ')}` })
    }

    return chips.length ? chips : [{ key: 'all', label: 'All problem clusters' }]
}
