import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import toast from 'react-hot-toast'
import { ClusterSearchInner } from '@/app/(core)/dashboard/(discovery)/discover/search/page'
import type {
    SearchAgentResponse,
    SearchInterpretation,
    SearchQueryResponse,
    SearchSessionDetail,
    SearchSessionSummary,
} from '@/lib/types/search'

const mockRouterPush = jest.fn()

jest.mock('@/lib/firebase', () => ({
    auth: { currentUser: { getIdToken: jest.fn().mockResolvedValue('firebase-token') } },
}))

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockRouterPush }),
}))

jest.mock('react-hot-toast', () => ({
    __esModule: true,
    default: { success: jest.fn(), error: jest.fn() },
}))

jest.mock('@/app/(core)/dashboard/(discovery)/discover/search/ClusterDetailPanel', () => ({
    __esModule: true,
    default: () => null,
}))

jest.mock('@/app/(core)/dashboard/components/ProjectSetupModal', () => ({
    __esModule: true,
    default: () => null,
}))

const draft = {
    query: 'late invoice payments',
    opportunity_domains: ['fintech'],
    opportunity_types: ['software'],
    sources: ['reddit'],
    communities: ['r/freelance'],
    min_posts: 5,
    observed_after: null,
    trending_only: false,
    min_signal_score: 0.7,
    sort: 'signal_score' as const,
    limit: 20,
    offset: 0,
}

const interpretation: SearchInterpretation = {
    draft,
    confirmation: 'Confirm these filters before I search the database.',
    assumptions: ['Payment delays were interpreted as invoicing problems.'],
    unsupported: [],
    clarification_question: null,
    needs_clarification: false,
    needs_confirmation: true,
    fallback_used: false,
    available_options: {
        opportunity_domains: ['fintech'],
        opportunity_types: ['software'],
        sources: ['reddit', 'hackernews'],
        communities: ['r/freelance'],
    },
}

const agentResponse: SearchAgentResponse = {
    ...interpretation,
    steps: [
        { sequence: 1, action: 'inspect_filter_options', outcome: 'completed' },
        { sequence: 2, action: 'prepare_search_draft', outcome: 'completed' },
    ],
    stop_reason: 'confirmation_required',
}

const queryResponse: SearchQueryResponse = {
    data: [{
        id: 42,
        name: 'Freelancers struggle with late invoice payments',
        summary: 'Independent workers repeatedly chase overdue invoices.',
        signalScore: 0.91,
        opportunity_type: 'software',
        opportunity_domain: 'fintech',
        problemStatement: 'Freelancers lose time and cash flow while chasing invoices.',
        post_count: 18,
        trending_status: null,
        date_range_end: '2026-07-20T00:00:00Z',
        sources: ['reddit'],
        subreddits: ['r/freelance'],
        sample_posts: [
            { id: 'post-1', title: 'Late invoices are creating monthly cash-flow gaps' },
            { id: 'post-2', title: 'Freelancers spend hours chasing overdue payments' },
        ],
        is_watched: false,
    }],
    total: 1,
    applied_filters: {
        query: draft.query,
        opportunity_domains: draft.opportunity_domains,
        opportunity_types: draft.opportunity_types,
        sources: draft.sources,
        communities: draft.communities,
        min_posts: draft.min_posts,
        observed_after: draft.observed_after,
        trending_only: draft.trending_only,
        min_signal_score: draft.min_signal_score,
        sort: draft.sort,
    },
    pagination: {
        limit: 20,
        offset: 0,
        returned: 1,
        has_more: false,
        next_offset: null,
    },
}

const session: SearchSessionSummary = {
    id: 'session-1',
    title: 'New search',
    saved: false,
    archived: false,
    expires_at: '2026-08-20T00:00:00Z',
    last_activity_at: '2026-07-21T00:00:00Z',
    created_at: '2026-07-21T00:00:00Z',
    updated_at: '2026-07-21T00:00:00Z',
}

function jsonResponse(body: unknown, status = 200): Promise<Response> {
    return Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(JSON.stringify(body)),
    } as Response)
}

function historyResponse(url: string, init?: RequestInit): Promise<Response> | null {
    if (url === '/api/clusters/search/sessions' && init?.method === 'POST') {
        return jsonResponse(session, 201)
    }
    if (url.endsWith('/turns') && init?.method === 'POST') return jsonResponse({}, 201)
    if (url.endsWith('/runs') && init?.method === 'POST') return jsonResponse({}, 201)
    return null
}

describe('conversational Search', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockRouterPush.mockReset()
    })

    it('runs the bounded agent first and cannot query the database until the user confirms', async () => {
        const fetchMock = jest.fn((...args: [RequestInfo | URL, RequestInit?]) => {
            const [input, init] = args
            const url = String(input)
            const history = historyResponse(url, init)
            if (history) return history
            if (url.endsWith('/agent')) return jsonResponse(agentResponse)
            if (url.endsWith('/query')) return jsonResponse(queryResponse)
            throw new Error(`Unexpected request: ${url}`)
        })
        global.fetch = fetchMock as unknown as typeof fetch
        const user = userEvent.setup()

        render(<ClusterSearchInner />)

        await user.type(screen.getByLabelText('Search message'), 'Find freelancers with late invoices')
        await user.click(screen.getByRole('button', { name: 'Send search message' }))

        expect(await screen.findByText(interpretation.confirmation)).toBeInTheDocument()
        const agentCalls = fetchMock.mock.calls.filter(([request]) => String(request).endsWith('/agent'))
        expect(agentCalls).toHaveLength(1)
        expect(screen.getByLabelText('Agent activity')).toHaveTextContent('Checked database filters')
        expect(screen.getByLabelText('Agent activity')).toHaveTextContent('Prepared search draft')
        expect(screen.getByLabelText('Agent activity')).toHaveTextContent('Ready for confirmation')
        expect(screen.queryByText(queryResponse.data[0].name!)).not.toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: /confirm & search/i }))

        expect(await screen.findByText(queryResponse.data[0].name!)).toBeInTheDocument()
        const queryCalls = fetchMock.mock.calls.filter(([request]) => String(request).endsWith('/query'))
        expect(queryCalls).toHaveLength(1)
        expect(JSON.parse(String(queryCalls[0][1]?.body))).toEqual(draft)
        expect(screen.getByText('Results from the problem database—not generated answers.')).toBeInTheDocument()
        expect(screen.getByText('Last observed Jul 20, 2026')).toBeInTheDocument()
        expect(screen.getByText('Sample evidence')).toBeInTheDocument()
        expect(screen.getByText('Late invoices are creating monthly cash-flow gaps')).toBeInTheDocument()
        expect(screen.getByRole('button', {
            name: `View evidence for ${queryResponse.data[0].name}`,
        })).toBeInTheDocument()
        expect(screen.getByRole('article')).not.toHaveAttribute('tabindex')

        await waitFor(() => {
            expect(fetchMock.mock.calls.some(([request]) => String(request).endsWith('/turns'))).toBe(true)
            expect(fetchMock.mock.calls.some(([request]) => String(request).endsWith('/runs'))).toBe(true)
        })
        const turnCall = fetchMock.mock.calls.find(([request]) => String(request).endsWith('/turns'))!
        const runCall = fetchMock.mock.calls.find(([request]) => String(request).endsWith('/runs'))!
        expect(JSON.parse(String(turnCall[1]?.body))).toEqual({
            user_message: 'Find freelancers with late invoices',
            interpretation,
        })
        expect(JSON.parse(String(runCall[1]?.body))).toEqual({
            draft,
            result_cluster_ids: ['42'],
            result_count: 1,
        })
    })

    it('loads more structured results and preserves Pipeline and Signal actions', async () => {
        const firstPage: SearchQueryResponse = {
            ...queryResponse,
            total: 2,
            pagination: {
                limit: 20,
                offset: 0,
                returned: 1,
                has_more: true,
                next_offset: 20,
            },
        }
        const secondCluster = {
            ...queryResponse.data[0],
            id: 43,
            name: 'Small agencies struggle to collect overdue retainers',
            date_range_end: '2026-07-18T00:00:00Z',
            sample_posts: [{ id: 'post-3', title: 'Retainer reminders interrupt client work' }],
        }
        const secondPage: SearchQueryResponse = {
            ...queryResponse,
            data: [secondCluster],
            total: 2,
            pagination: {
                limit: 20,
                offset: 20,
                returned: 1,
                has_more: false,
                next_offset: null,
            },
        }
        const fetchMock = jest.fn((...args: [RequestInfo | URL, RequestInit?]) => {
            const [request, init] = args
            const url = String(request)
            const history = historyResponse(url, init)
            if (history) return history
            if (url.endsWith('/agent')) return jsonResponse(agentResponse)
            if (url.endsWith('/query')) {
                const requestDraft = JSON.parse(String(init?.body)) as typeof draft
                return jsonResponse(requestDraft.offset === 20 ? secondPage : firstPage)
            }
            if (url === '/api/pipeline/watch') return jsonResponse({ pipeline_id: 'pipeline-42' })
            throw new Error(`Unexpected request: ${url}`)
        })
        global.fetch = fetchMock as unknown as typeof fetch
        const user = userEvent.setup()

        render(<ClusterSearchInner />)

        await user.type(screen.getByLabelText('Search message'), 'Find overdue payment problems')
        await user.click(screen.getByRole('button', { name: 'Send search message' }))
        await user.click(await screen.findByRole('button', { name: /confirm & search/i }))

        expect(await screen.findByText(queryResponse.data[0].name!)).toBeInTheDocument()
        await user.click(screen.getByRole('button', { name: 'Load more' }))

        expect(await screen.findByText(secondCluster.name)).toBeInTheDocument()
        const queryCalls = fetchMock.mock.calls.filter(([request]) => String(request).endsWith('/query'))
        expect(queryCalls).toHaveLength(2)
        expect(JSON.parse(String(queryCalls[1][1]?.body))).toEqual({ ...draft, offset: 20 })

        await user.click(screen.getAllByRole('button', { name: 'Add to Pipeline' })[0])
        await user.click(await screen.findByRole('button', { name: 'Open Signal' }))

        await waitFor(() => {
            expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/discover/signal?pipelineId=pipeline-42')
        })
    })

    it('keeps the draft across a clarification turn without executing search', async () => {
        const clarification: SearchAgentResponse = {
            ...agentResponse,
            confirmation: 'I need one detail before I can prepare the database search.',
            clarification_question: 'Should recent mean the last 30 or 90 days?',
            needs_clarification: true,
            needs_confirmation: false,
            stop_reason: 'clarification_required',
        }
        const confirmed: SearchAgentResponse = {
            ...agentResponse,
            draft: { ...draft, observed_after: '2026-04-22T00:00:00Z' },
        }
        let agentCount = 0
        const fetchMock = jest.fn((...args: [RequestInfo | URL, RequestInit?]) => {
            const [request, init] = args
            const url = String(request)
            const history = historyResponse(url, init)
            if (history) return history
            if (url.endsWith('/agent')) {
                agentCount += 1
                return jsonResponse(agentCount === 1 ? clarification : confirmed)
            }
            throw new Error(`Unexpected request: ${url}`)
        })
        global.fetch = fetchMock as unknown as typeof fetch
        const user = userEvent.setup()

        render(<ClusterSearchInner />)

        await user.type(screen.getByLabelText('Search message'), 'Find recent invoice problems')
        await user.click(screen.getByRole('button', { name: 'Send search message' }))

        expect(await screen.findByText(clarification.clarification_question!)).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /confirm & search/i })).not.toBeInTheDocument()

        await user.type(screen.getByLabelText('Search message'), 'Use the last 90 days')
        await user.click(screen.getByRole('button', { name: 'Send search message' }))

        await waitFor(() => expect(screen.getByRole('button', { name: /confirm & search/i })).toBeInTheDocument())
        const agentCalls = fetchMock.mock.calls.filter(([request]) => String(request).endsWith('/agent'))
        expect(agentCalls).toHaveLength(2)
        const secondRequest = JSON.parse(String(agentCalls[1][1]?.body))
        expect(secondRequest).toEqual({
            message: 'Use the last 90 days',
            current_draft: draft,
        })
    })

    it('keeps Search usable when session persistence is unavailable', async () => {
        const fetchMock = jest.fn((...args: [RequestInfo | URL, RequestInit?]) => {
            const [request, init] = args
            const url = String(request)
            if (url === '/api/clusters/search/sessions' && init?.method === 'POST') {
                return jsonResponse({ error: 'History unavailable' }, 503)
            }
            if (url.endsWith('/agent')) return jsonResponse(agentResponse)
            if (url.endsWith('/query')) return jsonResponse(queryResponse)
            throw new Error(`Unexpected request: ${url}`)
        })
        global.fetch = fetchMock as unknown as typeof fetch
        const user = userEvent.setup()

        render(<ClusterSearchInner />)

        await user.type(screen.getByLabelText('Search message'), 'Find late invoice problems')
        await user.click(screen.getByRole('button', { name: 'Send search message' }))
        await user.click(await screen.findByRole('button', { name: /confirm & search/i }))

        expect(await screen.findByText(queryResponse.data[0].name!)).toBeInTheDocument()
        expect(fetchMock.mock.calls.filter(([request]) => String(request).endsWith('/query'))).toHaveLength(1)
        expect(toast.error).toHaveBeenCalledWith(
            'Search is working, but this conversation could not be saved to history.',
        )
        expect(toast.error).toHaveBeenCalledWith(
            'Results loaded, but this search run could not be saved to history.',
        )
    })

    it('resumes a prior conversation and reruns its last draft against live data', async () => {
        const savedSession: SearchSessionSummary = {
            ...session,
            title: 'Invoice research',
            saved: true,
            expires_at: null,
        }
        const detail: SearchSessionDetail = {
            ...savedSession,
            turns: [{
                id: 'turn-1',
                user_message: 'Find freelancers with late invoices',
                interpretation,
                created_at: '2026-07-21T00:01:00Z',
            }],
            runs: [{
                id: 'run-1',
                draft,
                result_cluster_ids: ['42'],
                result_count: 1,
                created_at: '2026-07-21T00:02:00Z',
            }],
        }
        const fetchMock = jest.fn((...args: [RequestInfo | URL, RequestInit?]) => {
            const [request, init] = args
            const url = String(request)
            if (url === '/api/clusters/search/sessions?view=recent') return jsonResponse([savedSession])
            if (url === `/api/clusters/search/sessions/${savedSession.id}` && !init?.method) {
                return jsonResponse(detail)
            }
            if (url.endsWith('/query')) return jsonResponse(queryResponse)
            throw new Error(`Unexpected request: ${url}`)
        })
        global.fetch = fetchMock as unknown as typeof fetch
        const user = userEvent.setup()

        render(<ClusterSearchInner />)

        await user.click(screen.getByRole('button', { name: 'Open search history' }))
        await user.click(await screen.findByText(savedSession.title))

        expect(await screen.findByText('Find freelancers with late invoices')).toBeInTheDocument()
        expect(await screen.findByText(queryResponse.data[0].name!)).toBeInTheDocument()
        const queryCalls = fetchMock.mock.calls.filter(([request]) => String(request).endsWith('/query'))
        expect(queryCalls).toHaveLength(1)
        expect(JSON.parse(String(queryCalls[0][1]?.body))).toEqual(draft)
        expect(fetchMock.mock.calls.some(([request]) => String(request).endsWith('/runs'))).toBe(false)
    })

    it('lets a recent search be saved from history', async () => {
        const savedSession = { ...session, saved: true, expires_at: null }
        const fetchMock = jest.fn((...args: [RequestInfo | URL, RequestInit?]) => {
            const [request, init] = args
            const url = String(request)
            if (url === '/api/clusters/search/sessions?view=recent') return jsonResponse([session])
            if (url === `/api/clusters/search/sessions/${session.id}` && init?.method === 'PATCH') {
                return jsonResponse(savedSession)
            }
            throw new Error(`Unexpected request: ${url}`)
        })
        global.fetch = fetchMock as unknown as typeof fetch
        const user = userEvent.setup()

        render(<ClusterSearchInner />)

        await user.click(screen.getByRole('button', { name: 'Open search history' }))
        await user.click(await screen.findByRole('button', { name: `Save ${session.title}` }))

        await waitFor(() => {
            const patchCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')
            expect(patchCall).toBeDefined()
            expect(JSON.parse(String(patchCall?.[1]?.body))).toEqual({ saved: true })
        })
    })

    it('disables history mutations while an update is pending', async () => {
        const savedSession = { ...session, saved: true, expires_at: null }
        let resolvePatch!: (response: Response) => void
        const patchResponse = new Promise<Response>(resolve => {
            resolvePatch = resolve
        })
        const fetchMock = jest.fn((...args: [RequestInfo | URL, RequestInit?]) => {
            const [request, init] = args
            const url = String(request)
            if (url === '/api/clusters/search/sessions?view=recent') return jsonResponse([session])
            if (url === `/api/clusters/search/sessions/${session.id}` && init?.method === 'PATCH') {
                return patchResponse
            }
            throw new Error(`Unexpected request: ${url}`)
        })
        global.fetch = fetchMock as unknown as typeof fetch
        const user = userEvent.setup()

        render(<ClusterSearchInner />)

        await user.click(screen.getByRole('button', { name: 'Open search history' }))
        await user.click(await screen.findByRole('button', { name: `Save ${session.title}` }))

        await waitFor(() => {
            expect(screen.getByRole('button', { name: `Delete ${session.title}` })).toBeDisabled()
            expect(screen.getByRole('button', { name: `Archive ${session.title}` })).toBeDisabled()
        })

        resolvePatch(await jsonResponse(savedSession))
        await waitFor(() => {
            expect(screen.getByRole('button', { name: `Delete ${session.title}` })).toBeEnabled()
        })
    })
})
