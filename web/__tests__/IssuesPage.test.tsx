import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import IssuesPage from '@/app/(core)/dashboard/(manage)/manage/issues/page'
import IssueDetailPage from '@/app/(core)/dashboard/(manage)/manage/issues/[issueId]/page'
import type { Issue, IssueDetail } from '@/lib/types/issue'

jest.mock('next/navigation', () => ({
    useSearchParams: () => new URLSearchParams('pipelineId=pipe-1'),
    useRouter: () => ({ replace: jest.fn() }),
}))

jest.mock('@/app/(core)/dashboard/contexts/WorkspaceContext', () => ({
    useWorkspace: () => ({
        selectedPipelineId: 'pipe-1',
        setSelectedPipelineId: jest.fn(),
        hydrated: true,
    }),
}))

function response(body: unknown, ok = true) {
    return Promise.resolve({
        ok,
        status: ok ? 200 : 400,
        text: () => Promise.resolve(JSON.stringify(body)),
        json: () => Promise.resolve(body),
    } as Response)
}

function issue(overrides: Partial<Issue> = {}): Issue {
    return {
        id: 'issue-1',
        userId: 'user-1',
        teamId: null,
        assigneeId: null,
        assignee: null,
        pipelineId: 'pipe-1',
        project: { id: 'pipe-1', name: 'Validation Project', stage: 'validating' },
        team: null,
        parentIssueId: null,
        title: 'Analyze signals',
        summary: 'Review the strongest evidence.',
        status: 'open',
        issueType: 'issue',
        position: 0,
        source: 'analyze_signals',
        commentCount: 0,
        subIssueCount: 0,
        createdAt: '2026-06-16T00:00:00Z',
        updatedAt: '2026-06-16T00:00:00Z',
        closedAt: null,
        ...overrides,
    }
}

function issueDetail(overrides: Partial<IssueDetail> = {}): IssueDetail {
    return {
        ...issue(),
        comments: [],
        subIssues: [],
        ...overrides,
    }
}

afterEach(() => {
    jest.clearAllMocks()
})

describe('IssuesPage', () => {
    it('renders issues and creates a pipeline-linked issue', async () => {
        const created = issue({ id: 'issue-2', title: 'Check comments', source: null })
        global.fetch = jest.fn((url: string, init?: RequestInit) => {
            if (url === '/api/pipeline') return response({ data: [] })
            if (url === '/api/issues' && init?.method === 'POST') return response({ data: created })
            return response({ data: [issue()] })
        }) as unknown as typeof fetch

        render(<IssuesPage />)

        expect(await screen.findByText('Analyze signals')).toBeInTheDocument()
        expect(screen.getByText('Open issues for Validation Project')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'New issue' }))
        fireEvent.change(screen.getByLabelText('Issue title'), { target: { value: 'Check comments' } })
        fireEvent.change(screen.getByLabelText('Issue summary'), { target: { value: 'Read the source posts.' } })
        fireEvent.click(screen.getByRole('button', { name: 'Create issue' }))

        await waitFor(() => expect(screen.getByText('Check comments')).toBeInTheDocument())
        expect(global.fetch).toHaveBeenCalledWith('/api/issues', expect.objectContaining({ method: 'POST' }))
    })
})

describe('IssueDetailPage', () => {
    it('renders detail and adds a comment and subissue', async () => {
        const detail = issueDetail()
        const comment = {
            id: 'comment-1',
            issueId: 'issue-1',
            userId: 'user-1',
            authorDisplayName: 'You',
            body: 'Looks worth validating.',
            createdAt: '2026-06-16T00:00:00Z',
            updatedAt: '2026-06-16T00:00:00Z',
        }
        const subIssue = issue({ id: 'issue-3', title: 'Interview three users', parentIssueId: 'issue-1' })
        global.fetch = jest.fn((url: string, init?: RequestInit) => {
            if (url === '/api/issues/issue-1/comments' && init?.method === 'POST') return response({ data: comment })
            if (url === '/api/issues/issue-1/subissues' && init?.method === 'POST') return response({ data: subIssue })
            return response({ data: detail })
        }) as unknown as typeof fetch

        render(<IssueDetailPage params={Promise.resolve({ issueId: 'issue-1' })} />)

        expect(await screen.findByDisplayValue('Analyze signals')).toBeInTheDocument()
        expect(screen.getAllByText('Validation Project').length).toBeGreaterThan(0)
        expect(screen.getByText('Subissues for Analyze signals')).toBeInTheDocument()
        fireEvent.change(screen.getByLabelText('Comment body'), { target: { value: 'Looks worth validating.' } })
        fireEvent.click(screen.getByRole('button', { name: 'Add comment' }))
        await waitFor(() => expect(screen.getByText('Looks worth validating.')).toBeInTheDocument())

        fireEvent.change(screen.getByLabelText('Subissue title'), { target: { value: 'Interview three users' } })
        fireEvent.click(screen.getByRole('button', { name: 'Add' }))
        await waitFor(() => expect(screen.getByText('Interview three users')).toBeInTheDocument())
    })

    it('updates the assignee from issue team members', async () => {
        const member = {
            id: 'member-1',
            teamId: 'team-1',
            userId: 'user-1',
            email: 'alex@example.com',
            displayName: 'Alex',
            role: 'member' as const,
            status: 'active' as const,
            createdAt: '2026-06-01T00:00:00Z',
            updatedAt: '2026-06-01T00:00:00Z',
        }
        const detail = issueDetail({
            teamId: 'team-1',
            team: { id: 'team-1', name: 'Launch Lab', description: null },
        })
        const assigned = issueDetail({
            ...detail,
            assigneeId: 'member-1',
            assignee: member,
        })
        global.fetch = jest.fn((url: string, init?: RequestInit) => {
            if (url === '/api/teams/team-1') {
                return response({
                    data: {
                        id: 'team-1',
                        ownerUserId: 'user-1',
                        name: 'Launch Lab',
                        description: null,
                        role: 'owner',
                        members: [member],
                        createdAt: '2026-06-01T00:00:00Z',
                        updatedAt: '2026-06-01T00:00:00Z',
                    },
                })
            }
            if (url === '/api/issues/issue-1' && init?.method === 'PATCH') return response({ data: assigned })
            return response({ data: detail })
        }) as unknown as typeof fetch

        render(<IssueDetailPage params={Promise.resolve({ issueId: 'issue-1' })} />)

        const select = await screen.findByLabelText('Issue assignee')
        fireEvent.change(select, { target: { value: 'member-1' } })

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/issues/issue-1', expect.objectContaining({
                method: 'PATCH',
                body: JSON.stringify({ assignee_id: 'member-1' }),
            }))
        })
    })
})
