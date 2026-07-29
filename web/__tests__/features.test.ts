import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { isDeferredPath, isFeatureEnabledFor, resolveProfile } from '@/lib/features'

describe('release feature profiles', () => {
    it('accepts either explicit profile', () => {
        expect(resolveProfile('core', 'production')).toBe('core')
        expect(resolveProfile('  FULL ', 'production')).toBe('full')
    })

    it('defaults to full outside deployment builds', () => {
        for (const value of ['', undefined, null, 'typo']) {
            expect(resolveProfile(value, 'development')).toBe('full')
            expect(resolveProfile(value, 'test')).toBe('full')
        }
    })

    it('rejects missing or invalid deployment profiles', () => {
        for (const value of ['', undefined, null, 'prod', 'core-ish']) {
            expect(() => resolveProfile(value, 'production')).toThrow('NEXT_PUBLIC_FEATURE_PROFILE')
        }
    })

    it('full profile enables everything', () => {
        for (const feature of ['portfolio', 'goals', 'timeline', 'teams', 'issues', 'monitor'] as const) {
            expect(isFeatureEnabledFor('full', feature)).toBe(true)
        }
    })

    it('core profile defers the post-launch surface', () => {
        for (const feature of ['portfolio', 'goals', 'timeline', 'teams', 'issues', 'monitor'] as const) {
            expect(isFeatureEnabledFor('core', feature)).toBe(false)
        }
    })

    it('core redirects deferred routes and keeps the core loop', () => {
        for (const path of [
            '/dashboard/manage/portfolio', '/dashboard/manage/goals', '/dashboard/manage/calendar',
            '/dashboard/manage/teams', '/dashboard/manage/issues', '/dashboard/manage/issues/abc',
            '/dashboard/monitor/command-center', '/dashboard/monitor/logs',
            '/dashboard/portfolio', '/dashboard/teams', '/dashboard/issues',
            '/dashboard/discover/posts', '/dashboard/build/tasks',
            '/dashboard/market', '/dashboard/validation', '/dashboard/future-feature',
        ]) {
            expect(isDeferredPath('core', path)).toBe(true)
        }
        for (const path of [
            '/dashboard', '/dashboard/manage/pipeline', '/dashboard/discover/search',
            '/dashboard/discover/signal', '/dashboard/build/breakdown', '/dashboard/settings',
        ]) {
            expect(isDeferredPath('core', path)).toBe(false)
        }
    })

    it('full profile never redirects', () => {
        expect(isDeferredPath('full', '/dashboard/monitor/logs')).toBe(false)
        expect(isDeferredPath('full', '/dashboard/manage/portfolio')).toBe(false)
    })

    it('uses the Next 16 proxy as the single route gate', () => {
        const root = join(__dirname, '..')
        const proxy = readFileSync(join(root, 'proxy.ts'), 'utf8')
        const nextConfig = readFileSync(join(root, 'next.config.ts'), 'utf8')
        expect(proxy).toContain("import { featureProfile, isDeferredPath } from '@/lib/features'")
        expect(proxy).toContain('isDeferredPath(featureProfile, pathname)')
        expect(proxy).toContain("featureProfile === 'core' && pathname === routes.core.dashboard")
        expect(proxy).toContain('routes.core.explore')
        expect(nextConfig).toContain("!['core', 'full'].includes(deploymentFeatureProfile)")
        expect(existsSync(join(root, 'middleware.ts'))).toBe(false)
    })
})
