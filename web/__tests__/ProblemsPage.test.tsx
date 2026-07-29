import { render, screen, waitFor } from '@testing-library/react'

jest.mock('@/app/(core)/dashboard/contexts/WorkspaceContext', () => ({
    useWorkspace: () => ({ selectedPipelineId: 'pipe-1', setSelectedPipelineId: jest.fn(), hydrated: true }),
}))

import ProblemsPage from '@/app/(core)/dashboard/(discovery)/problems/page'

function jsonOk(body: unknown) {
    return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(JSON.stringify(body)),
    } as Response)
}

function makeProblem(overrides: Record<string, unknown> = {}) {
    return {
        id: 'pr-1',
        pipelineId: 'pipe-1',
        title: 'Invoices never reconcile',
        description: null,
        sourcePostId: null,
        position: 0,
        createdAt: new Date().toISOString(), // recently created -> within the 120s window
        embeddingReady: false,
        ...overrides,
    }
}

function installFetch(problems: unknown[]) {
    global.fetch = jest.fn((url: string) => {
        if (url.includes('/api/problems/similar')) return jsonOk({ data: [] })
        if (url.includes('/api/problems')) return jsonOk({ data: problems })
        return jsonOk({})
    }) as unknown as typeof fetch
}

afterEach(() => jest.clearAllMocks())

describe('ProblemsPage - Analyzing badge', () => {
    it('shows the "Analyzing..." badge while the embedding is null', async () => {
        installFetch([makeProblem({ embeddingReady: false })])
        render(<ProblemsPage />)

        // Card renders once problems load.
        expect(await screen.findByText('Invoices never reconcile')).toBeInTheDocument()
        // Embedding not ready yet -> the analyzing indicator is shown.
        expect(screen.getByText(/Analyzing/)).toBeInTheDocument()
    })

    it('hides the "Analyzing..." badge once the embedding is populated', async () => {
        installFetch([makeProblem({ embeddingReady: true })])
        render(<ProblemsPage />)

        expect(await screen.findByText('Invoices never reconcile')).toBeInTheDocument()
        await waitFor(() => {
            expect(screen.queryByText(/Analyzing/)).not.toBeInTheDocument()
        })
    })
})
