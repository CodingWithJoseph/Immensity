import { routes } from '@/app/util/routes'
import type { MonitorView } from './lenses'

export interface MonitorEvidenceLink {
    label: string
    href: string
}

export interface MonitorWarRoomPlan {
    verdict: string
    evidence: string
    nextAction: string
    links: MonitorEvidenceLink[]
}

function withPipeline(route: string, pipelineId: string | null) {
    return pipelineId ? `${route}?pipelineId=${pipelineId}` : route
}

export function monitorWarRoomPlan(view: MonitorView, pipelineId: string | null): MonitorWarRoomPlan {
    const issues = withPipeline(routes.core.monitorErrors, pipelineId)
    const sessions = withPipeline(routes.core.monitorSessions, pipelineId)
    const traces = withPipeline(routes.core.monitorInvestigate, pipelineId)
    const problems = withPipeline(routes.core.monitorProblems, pipelineId)
    const setup = withPipeline(routes.core.monitorSetup, pipelineId)

    const baseLinks: MonitorEvidenceLink[] = [
        { label: 'Issues', href: issues },
        { label: 'Sessions', href: sessions },
        { label: 'Problems', href: problems },
        { label: 'Investigate', href: traces },
    ]

    switch (view) {
        case 'command':
            return {
                verdict: 'Start with the current product health verdict.',
                evidence: 'Trends, top issues, source health, and revenue movement are pulled together first.',
                nextAction: 'Open the highest-impact issue or start an investigation from the evidence.',
                links: baseLinks,
            }
        case 'traffic':
            return {
                verdict: 'Confirm whether attention changed before judging downstream behavior.',
                evidence: 'Visitors, pageviews, recent pageviews, and source freshness are the first pass.',
                nextAction: 'If traffic moved, compare usage, errors, and revenue in the same window.',
                links: [
                    { label: 'Usage', href: withPipeline(routes.core.monitorUsage, pipelineId) },
                    { label: 'Errors', href: issues },
                    { label: 'Revenue', href: withPipeline(routes.core.monitorRevenue, pipelineId) },
                ],
            }
        case 'usage':
            return {
                verdict: 'Decide whether people are reaching the intended behavior.',
                evidence: 'Activation, retention, funnel, top events, and recent events explain where usage changed.',
                nextAction: 'Open sessions or flow when the funnel shows a drop.',
                links: [
                    { label: 'Flow', href: withPipeline(routes.core.monitorFlow, pipelineId) },
                    { label: 'Sessions', href: sessions },
                    { label: 'Errors', href: issues },
                ],
            }
        case 'flow':
            return {
                verdict: 'Look for the path people actually take, not the path we expected.',
                evidence: 'Feature flow and page flow expose transitions, dead ends, and error-heavy steps.',
                nextAction: 'Open sessions or traces when a transition looks broken.',
                links: [
                    { label: 'Sessions', href: sessions },
                    { label: 'Experience', href: withPipeline(routes.core.monitorExperience, pipelineId) },
                    { label: 'Investigate', href: traces },
                ],
            }
        case 'sessions':
            return {
                verdict: 'Replay the user story as a timeline of events, logs, errors, and traces.',
                evidence: 'Session detail ties behavior to errors, releases, and trace ids.',
                nextAction: 'Promote repeated patterns into an investigation.',
                links: [
                    { label: 'Errors', href: issues },
                    { label: 'Logs', href: withPipeline(routes.core.monitorLogs, pipelineId) },
                    { label: 'Investigate', href: traces },
                ],
            }
        case 'experience':
            return {
                verdict: 'Check whether the product felt fast enough where users were active.',
                evidence: 'Per-page vitals, explorer health, load volume, and error rate show the blast radius.',
                nextAction: 'Use page rows to decide whether the issue is speed, errors, or both.',
                links: [
                    { label: 'Explorer', href: withPipeline(routes.core.monitorExperience, pipelineId) },
                    { label: 'Errors', href: issues },
                    { label: 'Sessions', href: sessions },
                ],
            }
        case 'errors':
            return {
                verdict: 'Rank issues by impact before reading individual stack traces.',
                evidence: 'Baseline charts, releases, affected sessions, and grouped issues show what changed.',
                nextAction: 'Open affected sessions, then start an investigation if the issue has a pattern.',
                links: [
                    { label: 'Sessions', href: sessions },
                    { label: 'Logs', href: withPipeline(routes.core.monitorLogs, pipelineId) },
                    { label: 'Investigate', href: traces },
                ],
            }
        case 'logs':
            return {
                verdict: 'Use logs as supporting evidence, not the first answer.',
                evidence: 'Level, release, session, and message filters narrow the supporting timeline.',
                nextAction: 'Attach the relevant log line to the active investigation.',
                links: [
                    { label: 'Sessions', href: sessions },
                    { label: 'Issues', href: issues },
                    { label: 'Investigate', href: traces },
                ],
            }
        case 'problems':
            return {
                verdict: 'Problems are monitor-detected situations that need a decision.',
                evidence: 'Baseline, observed value, severity, and before/during/after impact frame the situation.',
                nextAction: 'Use the problem as the starting point for a war-room investigation.',
                links: [
                    { label: 'Investigate', href: traces },
                    { label: 'Issues', href: issues },
                    { label: 'Sessions', href: sessions },
                ],
            }
        case 'investigate':
            return {
                verdict: 'Keep the evidence trail in one place until the situation is resolved.',
                evidence: 'Notes, issues, sessions, traces, features, releases, and reports belong together.',
                nextAction: 'Create or update the investigation timeline, then export the report when ready.',
                links: baseLinks,
            }
        case 'revenue':
            return {
                verdict: 'Separate normal revenue movement from behavior-driven revenue risk.',
                evidence: 'MRR, customer movement, daily revenue, source freshness, and sync state lead the review.',
                nextAction: 'Open insights when revenue moved and usage changed in the same window.',
                links: [
                    { label: 'Insights', href: withPipeline(routes.core.monitorRevenueInsights, pipelineId) },
                    { label: 'Usage', href: withPipeline(routes.core.monitorUsage, pipelineId) },
                    { label: 'Problems', href: problems },
                ],
            }
        case 'insights':
            return {
                verdict: 'Look for product behaviors that explain expansion or churn.',
                evidence: 'Behavior and revenue correlation candidates show which signals deserve follow-up.',
                nextAction: 'Turn strong candidates into product decisions or investigations.',
                links: [
                    { label: 'Revenue', href: withPipeline(routes.core.monitorRevenue, pipelineId) },
                    { label: 'Usage', href: withPipeline(routes.core.monitorUsage, pipelineId) },
                    { label: 'Investigate', href: traces },
                ],
            }
        case 'portfolio':
            return {
                verdict: 'Portfolio is the launched-product overview, not the investigation surface.',
                evidence: 'Use it to pick the product, then jump into a Monitor lens for the war-room view.',
                nextAction: 'Open Command Center for the selected product.',
                links: [
                    { label: 'Command Center', href: withPipeline(routes.core.monitorCommandCenter, pipelineId) },
                    { label: 'Setup', href: setup },
                ],
            }
    }
}
