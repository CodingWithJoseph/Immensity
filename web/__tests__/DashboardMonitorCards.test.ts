import { summarizeMonitorSnapshots } from '@/app/(core)/dashboard/components/DashboardMonitorCards'
import type { CommandCenterData, UsageMetrics } from '@/app/(core)/dashboard/(monitor)/monitor/types'
import type { PipelineCard } from '@/lib/types/cluster'

function usage(visitors: number, activeUsers: number, signups: number, activations: number): UsageMetrics {
    return {
        connected: true,
        summary14d: { visitors, activeUsers, signups, activations },
    } as UsageMetrics
}

function command(
    state: CommandCenterData['health']['state'],
    visitors: [number, number],
    signups: [number, number],
    revenue: [number, number] | null,
): CommandCenterData {
    return {
        health: { state, label: state, reason: `${state} reason` },
        revenueConnected: revenue != null,
        trends: {
            visitors: { current: visitors[0], previous: visitors[1], changePct: null },
            signups: { current: signups[0], previous: signups[1], changePct: null },
            revenue: { current: revenue?.[0] ?? null, previous: revenue?.[1] ?? null, changePct: null },
        },
    } as CommandCenterData
}

describe('summarizeMonitorSnapshots', () => {
    it('combines product usage, trends, revenue, and health', () => {
        const products = [{ id: 'one' }, { id: 'two' }] as PipelineCard[]
        const summary = summarizeMonitorSnapshots(products, [
            {
                usage: usage(100, 60, 20, 10),
                command: command('healthy', [120, 100], [20, 10], [10_000, 8_000]),
            },
            {
                usage: usage(50, 25, 5, 2),
                command: command('warning', [30, 30], [5, 5], null),
            },
        ])

        expect(summary.revenueCents).toBe(10_000)
        expect(summary.revenueChangePct).toBeCloseTo(0.25)
        expect(summary.activeUserRate).toBeCloseTo(85 / 150)
        expect(summary.activeUsersChangePct).toBeCloseTo(20 / 130)
        expect(summary.newUserRate).toBeCloseTo(25 / 150)
        expect(summary.newUsersChangePct).toBeCloseTo(10 / 15)
        expect(summary.activationRate).toBeCloseTo(12 / 25)
        expect(summary.healthyProducts).toBe(1)
        expect(summary.attentionProducts).toBe(1)
        expect(summary.healthProducts).toEqual([
            expect.objectContaining({ id: 'two', state: 'warning' }),
            expect.objectContaining({ id: 'one', state: 'healthy' }),
        ])
    })

    it('does not present disconnected sources as zero activity', () => {
        const products = [{ id: 'one' }] as PipelineCard[]
        const disconnected = { connected: false, summary14d: {} } as UsageMetrics
        const summary = summarizeMonitorSnapshots(products, [{ usage: disconnected, command: null }])

        expect(summary.reportingProducts).toBe(0)
        expect(summary.revenueCents).toBeNull()
        expect(summary.activeUserRate).toBeNull()
        expect(summary.unmonitoredProducts).toBe(1)
        expect(summary.healthProducts).toEqual([])
    })

    it('sums connected revenue even when product health has no data', () => {
        const products = [{ id: 'one' }, { id: 'two' }] as PipelineCard[]
        const summary = summarizeMonitorSnapshots(products, [
            { usage: null, command: command('no-data', [0, 0], [0, 0], [4_000, 2_000]) },
            { usage: null, command: command('healthy', [0, 0], [0, 0], [6_000, 5_000]) },
        ])

        expect(summary.revenueConnectedProducts).toBe(2)
        expect(summary.revenueCents).toBe(10_000)
        expect(summary.revenueChangePct).toBeCloseTo(3_000 / 7_000)
    })

    it('prioritizes unhealthy products within the three-product cap', () => {
        const products = ['Warning', 'Failing', 'Stale', 'Noisy'].map((name, index) => ({
            id: String(index),
            name,
        })) as PipelineCard[]
        const summary = summarizeMonitorSnapshots(products, [
            { usage: null, command: command('warning', [0, 0], [0, 0], null) },
            { usage: null, command: command('failing', [0, 0], [0, 0], null) },
            { usage: null, command: command('stale', [0, 0], [0, 0], null) },
            { usage: null, command: command('noisy', [0, 0], [0, 0], null) },
        ])

        expect(summary.healthProducts.map(product => product.state)).toEqual(['failing', 'warning', 'stale'])
    })
})
