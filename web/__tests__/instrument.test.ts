import { feature, startFeature, type FeatureHandle } from '@/lib/monitoring/instrument'

const win = window as unknown as { problemFinderUsage?: unknown }

afterEach(() => { delete win.problemFinderUsage })

describe('instrument wrapper', () => {
    it('delegates to the beacon when present', () => {
        const seen: string[] = []
        const handle = { ok() {}, error() {}, attr() { return handle }, step() { return { end() {} } }, end() {} }
        win.problemFinderUsage = {
            feature: (name: string, fn: (h: unknown) => unknown) => { seen.push(`feature:${name}`); return fn(handle) },
            startFeature: (name: string) => { seen.push(`startFeature:${name}`); return handle },
        }

        const result = feature('signup', () => 7)
        startFeature('checkout')

        expect(result).toBe(7)
        expect(seen).toEqual(['feature:signup', 'startFeature:checkout'])
    })

    it('runs the flow with a no-op handle when the beacon is absent', () => {
        let ran = false
        const result = feature('x', (h: FeatureHandle) => { h.attr({ a: 1 }).step('s').end(); h.ok(); ran = true; return 'ok' })
        expect(ran).toBe(true)
        expect(result).toBe('ok')
    })

    it('returns a chainable no-op handle from startFeature when absent', () => {
        expect(() => startFeature('z').attr({ a: 1 }).step('s').end()).not.toThrow()
        expect(() => startFeature('z').error(new Error('e')).end()).not.toThrow()
    })
})
