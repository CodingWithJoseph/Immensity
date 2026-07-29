import { fireEvent, render, screen, within } from '@testing-library/react'
import ExplorerPanel from '@/app/(core)/dashboard/(monitor)/monitor/components/ExplorerPanel'

function response(body: unknown) {
    return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(body)), json: () => Promise.resolve(body) } as Response)
}

const DATA = {
    data: {
        source: null,
        connected: true,
        windowDays: 14,
        rows: [
            { url: '/home', loads: 100, errors: 1, errorRate: 0.01, lcpP75: 2100, lcpRating: 'good', health: 'warning', spark: [1, 2, 3] },
            { url: '/cart', loads: 40, errors: 8, errorRate: 0.2, lcpP75: 4200, lcpRating: 'poor', health: 'unhealthy', spark: [4, 1, 0] },
        ],
    },
}

beforeEach(() => {
    global.fetch = jest.fn(() => response(DATA)) as unknown as typeof fetch
})

describe('ExplorerPanel', () => {
    it('renders rows sorted by loads, then re-sorts by error rate on header click', async () => {
        render(<ExplorerPanel pipelineId="pipe-1" />)

        await screen.findByText('/home')
        const rowText = () => screen.getAllByText(/^\/(home|cart)$/).map(el => el.textContent)
        // Default: loads desc -> /home (100) before /cart (40).
        expect(rowText()).toEqual(['/home', '/cart'])

        // Sort by error rate desc -> /cart (20%) first.
        fireEvent.click(screen.getByRole('button', { name: /err rate/i }))
        expect(rowText()).toEqual(['/cart', '/home'])

        // Health badge + felt-speed surfaced.
        expect(screen.getByText('unhealthy')).toBeInTheDocument()
        expect(screen.getByText('4.20s')).toBeInTheDocument()
        expect(screen.getByText('20.0%')).toBeInTheDocument()
    })
})
