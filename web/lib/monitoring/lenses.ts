import { routes } from '@/app/util/routes'

// A monitor "lens" is one entry in the Monitor section: a sidebar submenu item,
// a MonitorDashboard view (page heading + description), or both. This is the
// single source of truth — the sidebar order, the MonitorView union, and the
// per-view title/description/route all derive from this one ordered list, so a
// new monitor view is one entry here instead of a four-file edit.

export type MonitorGroup = 'overview' | 'revenue' | 'product' | 'triage' | 'setup'

export interface MonitorLens {
    /** Stable key; also the MonitorDashboard `view` value when `isView`. */
    key: string
    group: MonitorGroup
    /** Canonical route — the sidebar href and the routeForView target. */
    route: string
    /** Appears in the Monitor submenu. */
    inNav: boolean
    /** Sidebar label (present when `inNav`). */
    navLabel?: string
    /** Starts a new sidebar group, with this uppercase header. */
    groupStart?: string
    /** Is a MonitorDashboard view (has a page heading + description). */
    isView: boolean
    /** Page heading (present when `isView`). */
    title?: string
    /** Page description (present when `isView`). */
    description?: string
}

// Order = sidebar order. `setup` is a nav item but not a view; `portfolio` is a
// view but not a nav item (its routeForView points at Manage → Portfolio, kept
// from the original switch).
const RAW_LENSES = [
    { key: 'command', group: 'overview', route: routes.core.monitorCommandCenter, inNav: true, navLabel: 'Command Center',
        isView: true, title: 'Command Center', description: 'Health verdict, week-over-week trends, and what needs attention.' },
    { key: 'revenue', group: 'revenue', route: routes.core.monitorRevenue, inNav: true, navLabel: 'Revenue', groupStart: 'Revenue',
        isView: true, title: 'Revenue', description: 'Track revenue movement and subscription health.' },
    { key: 'insights', group: 'revenue', route: routes.core.monitorRevenueInsights, inNav: true, navLabel: 'Insights',
        isView: true, title: 'Revenue insights', description: 'Which product behaviors predict expansion vs churn.' },
    { key: 'traffic', group: 'product', route: routes.core.monitorTraffic, inNav: true, navLabel: 'Traffic', groupStart: 'Product',
        isView: true, title: 'Traffic', description: 'Track visitors, pageviews, and recent traffic events.' },
    { key: 'usage', group: 'product', route: routes.core.monitorUsage, inNav: true, navLabel: 'Usage',
        isView: true, title: 'Usage', description: 'Review usage, activation, and retention for launched products.' },
    { key: 'flow', group: 'product', route: routes.core.monitorFlow, inNav: true, navLabel: 'Flow',
        isView: true, title: 'Flow', description: 'How one page leads into the next, aggregated across all sessions.' },
    { key: 'sessions', group: 'product', route: routes.core.monitorSessions, inNav: true, navLabel: 'Sessions',
        isView: true, title: 'Sessions', description: 'Sessions as objects — each one aggregates a visitor’s events.' },
    { key: 'experience', group: 'product', route: routes.core.monitorExperience, inNav: true, navLabel: 'Experience',
        isView: true, title: 'Experience', description: 'Core Web Vitals (p75) per metric and per page.' },
    { key: 'errors', group: 'triage', route: routes.core.monitorErrors, inNav: true, navLabel: 'Errors', groupStart: 'Triage',
        isView: true, title: 'Errors', description: 'Monitor captured errors and issue impact.' },
    { key: 'logs', group: 'triage', route: routes.core.monitorLogs, inNav: true, navLabel: 'Logs',
        isView: true, title: 'Logs', description: 'Faceted client logs — filter by level and message.' },
    { key: 'problems', group: 'triage', route: routes.core.monitorProblems, inNav: true, navLabel: 'Problems',
        isView: true, title: 'Problems', description: 'Flagged conditions with before/during/after impact.' },
    { key: 'investigate', group: 'triage', route: routes.core.monitorInvestigate, inNav: true, navLabel: 'Investigate',
        isView: true, title: 'Investigate', description: 'Collect evidence and notes into a timeline, then export a report.' },
    { key: 'setup', group: 'setup', route: routes.core.monitorSetup, inNav: true, navLabel: 'Setup', groupStart: 'Setup',
        isView: false },
    { key: 'portfolio', group: 'overview', route: routes.core.portfolio, inNav: false,
        isView: true, title: 'Portfolio', description: 'Manage launched products and review traction across usage, revenue, and errors.' },
] as const satisfies readonly MonitorLens[]

// The MonitorDashboard view union, derived from the view entries above.
export type MonitorView = Extract<(typeof RAW_LENSES)[number], { isView: true }>['key']

// Exported widened to the interface so consumers see the optional fields
// (the `as const` literal types omit absent optionals like `groupStart`).
export const MONITOR_LENSES: readonly MonitorLens[] = RAW_LENSES

const BY_KEY = new Map<string, MonitorLens>(MONITOR_LENSES.map(lens => [lens.key, lens]))

export function lensFor(key: string): MonitorLens | undefined {
    return BY_KEY.get(key)
}

// Per-view accessors (replace the old viewLabel/viewDescription/routeForView
// switches). The defaults match the original `portfolio` fallback and never
// trigger, since every view key is in the registry.
export function monitorViewTitle(view: MonitorView): string {
    return lensFor(view)?.title ?? 'Portfolio'
}
export function monitorViewDescription(view: MonitorView): string {
    return lensFor(view)?.description ?? 'Manage launched products and review traction across usage, revenue, and errors.'
}
export function monitorViewRoute(view: MonitorView): string {
    return lensFor(view)?.route ?? routes.core.portfolio
}

// The Monitor submenu, derived for the sidebar.
export interface MonitorNavItem {
    key: string
    href: string
    label: string
    groupStart?: string
}
export const MONITOR_NAV: MonitorNavItem[] = MONITOR_LENSES
    .filter(lens => lens.inNav)
    .map(lens => ({ key: lens.key, href: lens.route, label: lens.navLabel ?? lens.title ?? lens.key, groupStart: lens.groupStart }))
