import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import IssuesPanel from '@/app/(core)/dashboard/(monitor)/monitor/components/IssuesPanel'
import type { IssueObject } from '@/app/(core)/dashboard/(monitor)/monitor/types'

const calls: string[] = []

function response(body: unknown) {
    return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(body)),
        json: () => Promise.resolve(body),
    } as Response)
}

function issue(overrides: Partial<IssueObject> = {}): IssueObject {
    return {
        id: 'iss-1',
        fingerprint: 'fp-1',
        title: 'TypeError: boom',
        level: 'error',
        status: 'unresolved',
        errorType: 'exception',
        lastRelease: 'v1.0.0',
        firstSeenAt: '2026-06-01T00:00:00Z',
        lastSeenAt: '2026-06-02T00:00:00Z',
        totalOccurrences: 10,
        occurrences: 10,
        affectedUsers: 3,
        affectedSessions: 4,
        trend: { direction: 'flat', recent: 0, prior: 0, changePct: null },
        ...overrides,
    }
}

function issuesBody(issues: IssueObject[]) {
    return {
        data: {
            source: null,
            connected: true,
            windowDays: 14,
            summary: { openIssues: issues.length, affectedUsers: 3, occurrences: 10 },
            issues,
            facets: {
                errorType: [{ value: 'exception', count: 3 }, { value: 'unhandled_rejection', count: 1 }],
                platform: [{ value: 'web', count: 2 }],
            },
            filters: { errorType: null, platform: null },
        },
    }
}

beforeEach(() => {
    calls.length = 0
    global.fetch = jest.fn((url: string) => {
        calls.push(String(url))
        // Narrow the list when the exception filter is applied.
        const filtered = String(url).includes('errorType=exception')
        return response(issuesBody(filtered ? [issue({ title: 'Filtered only' })] : [issue()]))
    }) as unknown as typeof fetch
})

describe('IssuesPanel dimension filter', () => {
    it('renders facet chips and refetches with the selected dimension', async () => {
        render(<IssuesPanel pipelineId="pipe-1" />)

        // List renders from the first (unfiltered) load.
        await screen.findByText('TypeError: boom')
        // Chips render from the response facets (value + count is unique to the chip).
        const chip = screen.getByRole('button', { name: /exception 3/ })
        expect(screen.getByRole('button', { name: /web 2/ })).toBeInTheDocument()

        expect(calls[0]).toContain('/api/monitor/pipe-1/issues')
        expect(calls[0]).not.toContain('errorType=')

        // Selecting the chip refetches scoped to that error_type.
        fireEvent.click(chip)
        await waitFor(() => expect(calls.some(u => u.includes('errorType=exception'))).toBe(true))
        await screen.findByText('Filtered only')
    })
})
