import {
    SignalWorkspaceApiError,
    askSignal,
    getSignalCase,
    updateSignalOverride,
} from '../signalWorkspaceApi'

function response(body: unknown, status = 200): Response {
    return {
        ok: status >= 200 && status < 300,
        status,
        text: async () => JSON.stringify(body),
    } as Response
}

describe('signalWorkspaceApi', () => {
    beforeEach(() => {
        Object.defineProperty(global, 'fetch', {
            configurable: true,
            writable: true,
            value: jest.fn(),
        })
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('loads the versioned Signal case route', async () => {
        const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>
        fetchMock.mockResolvedValue(response({ version: 0, status: 'queued' }))

        const result = await getSignalCase('pipeline / 1')

        expect(result.status).toBe('queued')
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/pipeline/pipeline%20%2F%201/signal/case',
            expect.objectContaining({ signal: undefined }),
        )
    })

    it('sends non-destructive object patches through the override route', async () => {
        const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>
        fetchMock.mockResolvedValue(response({ version: 1, status: 'ready' }))

        await updateSignalOverride(
            'pipeline-1',
            'problem_unit',
            'unit/1',
            { pinned: true },
        )

        expect(fetchMock).toHaveBeenCalledWith(
            '/api/pipeline/pipeline-1/signal/case/overrides/problem_unit/unit%2F1',
            expect.objectContaining({
                method: 'PATCH',
                body: JSON.stringify({ patch: { pinned: true } }),
            }),
        )
    })

    it('preserves the backend error message and status', async () => {
        const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>
        fetchMock.mockResolvedValue(response({ detail: 'Signal analysis is not ready' }, 409))

        await expect(askSignal('pipeline-1', 'conversation-1', 'Why?')).rejects.toEqual(
            expect.objectContaining<Partial<SignalWorkspaceApiError>>({
                message: 'Signal analysis is not ready',
                status: 409,
            }),
        )
    })
})
