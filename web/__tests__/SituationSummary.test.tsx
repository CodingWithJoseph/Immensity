import { render, screen } from '@testing-library/react'
import SituationSummary, { narrate } from '@/app/(core)/dashboard/(monitor)/monitor/components/SituationSummary'
import type { CommandCenterData } from '@/app/(core)/dashboard/(monitor)/monitor/types'

function trend(current: number, previous: number, changePct: number | null) {
    return { current, previous, changePct }
}

function data(over: Partial<CommandCenterData> = {}): CommandCenterData {
    return {
        windowDays: 14,
        growthWindowDays: 7,
        health: { state: 'warning', label: 'Degraded', reason: 'x', lastSeenAt: null, ageHours: 0 },
        signals: { errors: 600, sessions: 5000, errorRate: 0.032, lcpP75: 3600, lcpRating: 'poor' },
        trends: {
            visitors: trend(3180, 2960, 0.07),
            signups: trend(118, 144, -0.18),
            errors: trend(612, 38, 15.1),
            revenue: { current: 728400, previous: 700000, changePct: 0.04 },
        },
        revenueConnected: true,
        topIssues: [{ id: 'iss_1', title: "TypeError: reading 'series'", level: 'error', status: 'unresolved', eventCount: 842, lastRelease: 'v2.4.0', lastSeenAt: null }],
        ...over,
    }
}

describe('narrate', () => {
    it('leads with the error spike when errors are climbing', () => {
        const { headline, detail, tone } = narrate(data())
        expect(tone).toBe('bad')
        expect(headline).toMatch(/×/) // 612/38 ≈ 16×
        expect(detail).toContain('v2.4.0')
        expect(detail).toContain('3.2% of sessions')
    })

    it('falls back to the signup slide when errors are calm', () => {
        const calm = data({ trends: { ...data().trends, errors: trend(40, 38, 0.05) } })
        const { headline, tone } = narrate(calm)
        expect(tone).toBe('neutral')
        expect(headline).toMatch(/Signups are down 18%/)
    })

    it('says healthy when nothing is wrong', () => {
        const ok = data({
            trends: { ...data().trends, errors: trend(40, 38, 0.05), signups: trend(150, 144, 0.04) },
        })
        const { headline, tone } = narrate(ok)
        expect(tone).toBe('good')
        expect(headline).toMatch(/healthy/i)
    })
})

describe('SituationSummary', () => {
    beforeEach(() => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                status: 200,
                text: () => Promise.resolve(JSON.stringify({ data: { metric: 'errors', windowDays: 14, points: [{ date: 'd1', value: 5 }, { date: 'd2', value: 9 }, { date: 'd3', value: 180 }], baseline: { mean: 38, lower: 4, upper: 84 }, markers: [] } })),
                json: () => Promise.resolve({}),
            } as Response),
        ) as unknown as typeof fetch
    })

    it('renders the headline + an evidence sparkline', async () => {
        const { container } = render(<SituationSummary pipelineId="pipe-1" data={data()} />)
        expect(await screen.findByText(/Errors are running/)).toBeInTheDocument()
        // sparkline appears once the timeseries resolves.
        await screen.findByText('Errors / day')
        expect(container.querySelector('polyline')).toBeTruthy()
    })
})
