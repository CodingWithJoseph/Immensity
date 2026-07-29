import fs from 'fs'
import path from 'path'
import {
    MONITOR_LENSES, MONITOR_NAV, lensFor,
    monitorViewTitle, monitorViewDescription, monitorViewRoute,
    type MonitorView,
} from '@/lib/monitoring/lenses'
import { routes } from '@/app/util/routes'

// The exact sidebar submenu before the registry refactor — the byte-identical
// contract the registry must reproduce.
const EXPECTED_NAV = [
    { key: 'command', href: routes.core.monitorCommandCenter, label: 'Command Center', groupStart: undefined },
    { key: 'revenue', href: routes.core.monitorRevenue, label: 'Revenue', groupStart: 'Revenue' },
    { key: 'insights', href: routes.core.monitorRevenueInsights, label: 'Insights', groupStart: undefined },
    { key: 'traffic', href: routes.core.monitorTraffic, label: 'Traffic', groupStart: 'Product' },
    { key: 'usage', href: routes.core.monitorUsage, label: 'Usage', groupStart: undefined },
    { key: 'flow', href: routes.core.monitorFlow, label: 'Flow', groupStart: undefined },
    { key: 'sessions', href: routes.core.monitorSessions, label: 'Sessions', groupStart: undefined },
    { key: 'experience', href: routes.core.monitorExperience, label: 'Experience', groupStart: undefined },
    { key: 'errors', href: routes.core.monitorErrors, label: 'Errors', groupStart: 'Triage' },
    { key: 'logs', href: routes.core.monitorLogs, label: 'Logs', groupStart: undefined },
    { key: 'problems', href: routes.core.monitorProblems, label: 'Problems', groupStart: undefined },
    { key: 'investigate', href: routes.core.monitorInvestigate, label: 'Investigate', groupStart: undefined },
    { key: 'setup', href: routes.core.monitorSetup, label: 'Setup', groupStart: 'Setup' },
]

// The exact per-view title / description / route from the old switch functions.
const EXPECTED_VIEWS: Record<MonitorView, { title: string; description: string; route: string }> = {
    command: { title: 'Command Center', description: 'Health verdict, week-over-week trends, and what needs attention.', route: routes.core.monitorCommandCenter },
    traffic: { title: 'Traffic', description: 'Track visitors, pageviews, and recent traffic events.', route: routes.core.monitorTraffic },
    usage: { title: 'Usage', description: 'Review usage, activation, and retention for launched products.', route: routes.core.monitorUsage },
    flow: { title: 'Flow', description: 'How one page leads into the next, aggregated across all sessions.', route: routes.core.monitorFlow },
    sessions: { title: 'Sessions', description: 'Sessions as objects — each one aggregates a visitor’s events.', route: routes.core.monitorSessions },
    experience: { title: 'Experience', description: 'Core Web Vitals (p75) per metric and per page.', route: routes.core.monitorExperience },
    errors: { title: 'Errors', description: 'Monitor captured errors and issue impact.', route: routes.core.monitorErrors },
    logs: { title: 'Logs', description: 'Faceted client logs — filter by level and message.', route: routes.core.monitorLogs },
    problems: { title: 'Problems', description: 'Flagged conditions with before/during/after impact.', route: routes.core.monitorProblems },
    investigate: { title: 'Investigate', description: 'Collect evidence and notes into a timeline, then export a report.', route: routes.core.monitorInvestigate },
    revenue: { title: 'Revenue', description: 'Track revenue movement and subscription health.', route: routes.core.monitorRevenue },
    insights: { title: 'Revenue insights', description: 'Which product behaviors predict expansion vs churn.', route: routes.core.monitorRevenueInsights },
    portfolio: { title: 'Portfolio', description: 'Manage launched products and review traction across usage, revenue, and errors.', route: routes.core.portfolio },
}

describe('monitor lens registry', () => {
    it('reproduces the sidebar submenu byte-for-byte (order + labels + groups)', () => {
        expect(MONITOR_NAV).toEqual(EXPECTED_NAV)
    })

    it('reproduces every view title / description / route from the old switches', () => {
        for (const key of Object.keys(EXPECTED_VIEWS) as MonitorView[]) {
            expect(monitorViewTitle(key)).toBe(EXPECTED_VIEWS[key].title)
            expect(monitorViewDescription(key)).toBe(EXPECTED_VIEWS[key].description)
            expect(monitorViewRoute(key)).toBe(EXPECTED_VIEWS[key].route)
        }
    })

    it('covers exactly the original MonitorView set', () => {
        const views = MONITOR_LENSES.filter(l => l.isView).map(l => l.key).sort()
        expect(views).toEqual(Object.keys(EXPECTED_VIEWS).sort())
    })

    it('keeps every lens structurally complete', () => {
        for (const lens of MONITOR_LENSES) {
            expect(lens.route).toMatch(/^\//)
            if (lens.inNav) expect(lens.navLabel).toBeTruthy()
            if (lens.isView) {
                expect(lens.title).toBeTruthy()
                expect(lens.description).toBeTruthy()
            }
        }
    })

    it('points every monitor nav item at a real page', () => {
        const monitorNav = MONITOR_NAV.filter(item => item.href.startsWith('/dashboard/monitor/'))
        for (const item of monitorNav) {
            const seg = item.href.slice('/dashboard/'.length) // e.g. 'monitor/usage'
            const page = path.join(process.cwd(), 'app/(core)/dashboard/(monitor)', seg, 'page.tsx')
            expect(fs.existsSync(page)).toBe(true)
        }
    })

    it('lensFor resolves a known key and ignores an unknown one', () => {
        expect(lensFor('usage')?.title).toBe('Usage')
        expect(lensFor('nope')).toBeUndefined()
    })
})
