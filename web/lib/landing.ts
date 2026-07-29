import { routes } from '@/app/util/routes'

// Maps a saved `default_landing` preference (see Settings → Workspace) to the
// route a user should land on when they open the app. Unknown / empty values
// fall back to the dashboard (handled by callers).
export const LANDING_ROUTES: Record<string, string> = {
    dashboard: routes.core.dashboard,
    pipeline: routes.core.pipeline,
    monitor: routes.core.monitorPortfolio,
    discover: routes.core.explore,
}

export function landingRoute(key: string | null | undefined): string | null {
    if (!key) return null
    return LANDING_ROUTES[key] ?? null
}
