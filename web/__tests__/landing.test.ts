import { landingRoute } from '@/lib/landing'

describe('landingRoute', () => {
    it('maps known landing preferences to dashboard routes', () => {
        expect(landingRoute('dashboard')).toBe('/dashboard')
        expect(landingRoute('pipeline')).toBe('/dashboard/manage/pipeline')
        expect(landingRoute('monitor')).toBe('/dashboard/monitor/portfolio')
        expect(landingRoute('discover')).toBe('/dashboard/discover/search')
    })

    it('returns null for empty or unknown values', () => {
        expect(landingRoute(null)).toBeNull()
        expect(landingRoute(undefined)).toBeNull()
        expect(landingRoute('')).toBeNull()
        expect(landingRoute('nope')).toBeNull()
    })
})
