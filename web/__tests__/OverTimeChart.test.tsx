import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import OverTimeChart from '@/app/(core)/dashboard/(monitor)/monitor/components/OverTimeChart'

const calls: string[] = []

function response(body: unknown) {
    return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(body)), json: () => Promise.resolve(body) } as Response)
}

function payload(metric: 'errors' | 'loads') {
    return {
        data: {
            metric,
            windowDays: 14,
            points: [
                { date: '2026-06-01', value: 1 },
                { date: '2026-06-02', value: 9 },
                { date: '2026-06-03', value: 2 },
            ],
            baseline: { mean: 4, lower: 0, upper: 7 },
            markers: [{ date: '2026-06-02', release: 'v1.2.0' }],
        },
    }
}

beforeEach(() => {
    calls.length = 0
    global.fetch = jest.fn((url: string) => {
        calls.push(String(url))
        return response(payload(String(url).includes('metric=loads') ? 'loads' : 'errors'))
    }) as unknown as typeof fetch
})

describe('OverTimeChart', () => {
    it('draws the series and re-fetches when the metric toggles', async () => {
        const { container } = render(<OverTimeChart pipelineId="pipe-1" />)

        await waitFor(() => expect(container.querySelector('polyline')).toBeTruthy())
        // baseline band + deploy summary rendered.
        expect(container.querySelector('rect')).toBeTruthy()
        expect(screen.getByText('1 deploy')).toBeInTheDocument()
        expect(calls[0]).toContain('metric=errors')

        // Toggle to Loads -> refetch scoped to that metric.
        fireEvent.click(screen.getByRole('button', { name: 'Loads' }))
        await waitFor(() => expect(calls.some(u => u.includes('metric=loads'))).toBe(true))
    })
})
