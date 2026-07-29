import {
    appHref,
    hostnamesForOrigin,
    isLocalHost,
    normalizeHost,
} from '@/lib/domain-routing'

describe('domain routing helpers', () => {
    it('uses the configured console origin for production public links', () => {
        expect(appHref('/sign-in', {
            NODE_ENV: 'production',
            NEXT_PUBLIC_APP_URL: 'https://console.immensity.com/',
        })).toBe('https://console.immensity.com/sign-in')
    })

    it('keeps local development on the same app when the env points at production', () => {
        expect(appHref('/sign-in', {
            NODE_ENV: 'development',
            NEXT_PUBLIC_APP_URL: 'https://console.immensity.com',
        })).toBe('/sign-in')
    })

    it('keeps same-app development relative even when a local origin is configured', () => {
        expect(appHref('/sign-in', {
            NODE_ENV: 'development',
            NEXT_PUBLIC_APP_URL: 'http://localhost:3002',
        })).toBe('/sign-in')
    })

    it('recognizes localhost hosts so proxy domain redirects can skip them', () => {
        expect(isLocalHost('localhost:3001')).toBe(true)
        expect(isLocalHost('[::1]:3001')).toBe(true)
        expect(isLocalHost('www.immensity.com')).toBe(false)
    })

    it('derives bare and www marketing hosts from the configured site origin', () => {
        expect([...hostnamesForOrigin('https://www.immensity.com', true)].sort())
            .toEqual(['immensity.com', 'www.immensity.com'])
    })

    it('normalizes forwarded host header values', () => {
        expect(normalizeHost('Console.Immensity.com, proxy.local')).toBe('console.immensity.com')
    })
})
