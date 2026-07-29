// Onboarding guide payload from GET /api/portfolio/getting-started. An ordered
// checklist that walks a new account through the product landscape (discover →
// build → launch → monitor) plus the single next action to take.
import { routes } from '@/app/util/routes'

export interface GettingStartedStep {
    key: string
    title: string
    description: string
    actionLabel: string
    // Maps to routes.core[routeKey] — a deep link to where the step is done.
    routeKey: string
    done: boolean
}

export interface GettingStartedNext {
    key: string
    title: string
    description: string
    actionLabel: string
    routeKey: string
}

export interface GettingStarted {
    steps: GettingStartedStep[]
    completedCount: number
    totalCount: number
    complete: boolean
    nextStep: GettingStartedNext | null
}

// Resolve a step's routeKey to an href, falling back to the dashboard if the
// backend ever sends a key the client doesn't know.
export function stepHref(routeKey: string): string {
    const core = routes.core as Record<string, string>
    return core[routeKey] ?? routes.core.dashboard
}
