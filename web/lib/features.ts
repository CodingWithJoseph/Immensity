// Release feature profiles. The initial release ships the core loop while
// everything already built stays in the codebase behind one build-time switch.
// This mirrors the backend's FEATURE_PROFILE setting.

export type FeatureProfile = 'core' | 'full'

export type AppFeature =
    | 'portfolio'
    | 'goals'
    | 'timeline'
    | 'teams'
    | 'issues'
    | 'monitor'

const CORE_DISABLED: ReadonlySet<AppFeature> = new Set([
    'portfolio', 'goals', 'timeline', 'teams', 'issues', 'monitor',
])

export function resolveProfile(
    value: string | undefined | null,
    nodeEnvironment: string | undefined = 'development',
): FeatureProfile {
    const profile = (value ?? '').trim().toLowerCase()
    if (profile === 'core' || profile === 'full') return profile

    // Keep local development frictionless. Next.js sets NODE_ENV=production for
    // deploy builds, so missing or invalid deployment configuration stops the
    // build instead of accidentally exposing every deferred feature.
    if (nodeEnvironment !== 'production') return 'full'

    throw new Error(
        'NEXT_PUBLIC_FEATURE_PROFILE must be explicitly set to "core" or "full" for production builds',
    )
}

export function isFeatureEnabledFor(profile: FeatureProfile, feature: AppFeature): boolean {
    return profile === 'full' || !CORE_DISABLED.has(feature)
}

// The core release fails closed at the route boundary: only the five visible
// MVP product destinations are reachable. Settings stays reachable through the
// account menu. Everything else remains in the codebase and becomes reachable
// again under the full profile.
const CORE_PATH_PREFIXES: readonly string[] = [
    '/dashboard/discover/search',
    '/dashboard/discover/signal',
    '/dashboard/manage/pipeline',
    '/dashboard/build/breakdown',
    '/dashboard/settings',
]

export function isDeferredPath(profile: FeatureProfile, pathname: string): boolean {
    if (profile === 'full') return false
    if (pathname === '/dashboard') return false
    if (!pathname.startsWith('/dashboard/')) return false
    return !CORE_PATH_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`))
}

export const featureProfile: FeatureProfile = resolveProfile(
    process.env.NEXT_PUBLIC_FEATURE_PROFILE,
    process.env.NODE_ENV,
)

export function isFeatureEnabled(feature: AppFeature): boolean {
    return isFeatureEnabledFor(featureProfile, feature)
}
