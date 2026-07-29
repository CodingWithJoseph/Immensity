import type { PipelineCard } from '@/lib/types/cluster'

export type PortfolioOverviewMetricName = 'traffic' | 'usage' | 'revenue' | 'errors'
export type PortfolioTrendDirection = 'up' | 'down' | 'flat'

export interface PortfolioMetricPoint {
    date: string
    value: number | null
}

export interface PortfolioOverviewMetric {
    metric: PortfolioOverviewMetricName
    unit: 'count' | 'cents'
    currentTotal: number | null
    priorTotal: number | null
    comparisonCurrent: number | null
    comparisonDate: string | null
    percentChange: number | null
    trendDirection: PortfolioTrendDirection
    isPositiveTrend: boolean | null
    points: PortfolioMetricPoint[]
}

export interface PortfolioOverviewMetrics {
    comparisonDays: 7
    sparklineDays: 14
    metrics: PortfolioOverviewMetric[]
}

export interface UsageSource {
    id: string
    pipelineId: string
    publicKey: string
    name: string
    status: 'connected' | 'paused' | 'error'
    productUrl: string | null
    allowedDomain: string | null
    createdAt: string | null
    updatedAt: string | null
    lastSeenAt: string | null
}

export interface PortfolioProduct extends PipelineCard {
    usageSource: UsageSource | null
    revenueSource: RevenueSource | null
}

export interface UsageDaily {
    date: string
    pageviews: number
    visitors: number
    signups: number
    activations: number
    events: number
}

export interface UsageEvent {
    id: string
    eventType: string
    visitorId: string | null
    userId: string | null
    url: string | null
    referrer: string | null
    metadata: Record<string, unknown>
    occurredAt: string | null
}

export interface UsageFunnel {
    visited: number
    signedUp: number
    activated: number
    signupRate: number | null
    activationRate: number | null
}

export interface UsageGrowthMetric {
    current: number
    previous: number
    changePct: number | null
}

export interface UsageGrowth {
    visitors: UsageGrowthMetric
    signups: UsageGrowthMetric
}

export interface RetentionBucket {
    eligible: number
    retained: number
    rate: number | null
}

export interface RetentionCohort {
    date: string
    size: number
    d1Rate: number | null
    d7Rate: number | null
}

export interface UsageRetention {
    windowDays: number
    d1: RetentionBucket
    d7: RetentionBucket
    cohorts: RetentionCohort[]
}

export interface UsageMetrics {
    source: UsageSource | null
    connected: boolean
    totalEvents: number
    lastSeenAt: string | null
    windowDays: number
    growthWindowDays: number
    summary14d: {
        pageviews: number
        visitors: number
        signups: number
        logins: number
        activations: number
        customEvents: number
        activeUsers: number
    }
    health?: SourceHealth
    topPages: UsageTopPage[]
    topEvents: UsageTopEvent[]
    funnel?: UsageFunnel
    growth?: UsageGrowth
    retention?: UsageRetention
    daily: UsageDaily[]
    recentEvents: UsageEvent[]
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogLine {
    id: string
    level: LogLevel
    message: string
    url: string | null
    sessionId: string | null
    userRef: string | null
    release: string | null
    metadata: Record<string, unknown>
    occurredAt: string | null
}

export interface LogsMetrics {
    source: UsageSource | null
    connected: boolean
    windowDays: number
    levelCounts: Record<LogLevel, number>
    filters: { level: LogLevel | null; q: string | null; session: string | null; release: string | null }
    logs: LogLine[]
}

export interface Investigation {
    id: string
    title: string
    summary: string | null
    status: 'open' | 'resolved' | 'archived'
    createdAt: string | null
    updatedAt: string | null
}

export interface InvestigationEntry {
    id: string
    kind: 'note' | 'issue' | 'problem' | 'session' | 'link'
    refId: string | null
    body: string | null
    metadata: Record<string, unknown>
    createdAt: string | null
}

export interface InvestigationDetail {
    investigation: Investigation
    timeline: InvestigationEntry[]
}

export interface MonitoringReport {
    id: string
    title: string
    body: string
    investigationId: string | null
    createdAt: string | null
    updatedAt: string | null
}

export interface MonitoringProblem {
    id: string
    kind: string
    title: string
    detail: string | null
    severity: 'info' | 'warning' | 'critical'
    status: 'open' | 'resolved'
    metric: string | null
    baseline: number | null
    observed: number | null
    detectedAt: string | null
    resolvedAt: string | null
}

export interface ProblemImpact {
    metric: string | null
    windowHours: number
    before: number | null
    during: number | null
    after: number | null
}

export interface ProblemDetailData {
    problem: MonitoringProblem
    impact: ProblemImpact
}

export interface ProblemsData {
    problems: MonitoringProblem[]
}

export type HealthState = 'live' | 'stale' | 'silent' | 'noisy' | 'failing' | 'no-data' | 'healthy' | 'warning' | 'unhealthy'

export interface HealthVerdict {
    state: HealthState
    label: string
    reason: string
    lastSeenAt: string | null
    ageHours: number | null
}

export interface TrendValue {
    current: number
    previous: number
    changePct: number | null
}

export interface CommandCenterData {
    windowDays: number
    growthWindowDays: number
    health: HealthVerdict
    signals: { errors: number; sessions: number; errorRate: number | null; lcpP75: number | null; lcpRating: string | null }
    trends: {
        visitors: TrendValue
        signups: TrendValue
        errors: TrendValue
        revenue: { current: number | null; previous: number | null; changePct: number | null }
    }
    revenueConnected: boolean
    topIssues: { id: string; title: string; level: 'error' | 'warning'; status: string; eventCount: number; lastRelease: string | null; lastSeenAt: string | null }[]
}

export const SOURCE_HEALTH_STATES = ['healthy', 'warning', 'unhealthy', 'no-data'] as const
export type SourceHealthState = typeof SOURCE_HEALTH_STATES[number]

export interface SourceHealth {
    state: SourceHealthState
    label: string
    reason: string
    lastSeenAt: string | null
    ageHours: number | null
}

export interface SessionRow {
    sessionId: string
    visitorId: string | null
    userRef: string | null
    identified: boolean
    startedAt: string | null
    endedAt: string | null
    durationSeconds: number
    events: number
    pageviews: number
}

export interface SessionsMetrics {
    source: UsageSource | null
    connected: boolean
    windowDays: number
    summary: {
        totalSessions: number
        identifiedSessions: number
        avgEventsPerSession: number | null
    }
    sessions: SessionRow[]
}

export interface SessionTimelineItem {
    kind: 'event' | 'error'
    id: string
    occurredAt: string | null
    url: string | null
    eventType?: string
    name?: string | null
    metadata?: Record<string, unknown>
    groupId?: string | null
    fingerprint?: string
    message?: string
    level?: string
}

export interface SessionDetailData {
    source: UsageSource | null
    session: {
        sessionId: string
        visitorId: string | null
        userRef: string | null
        identified: boolean
        startedAt: string | null
        endedAt: string | null
        durationSeconds: number
        events: number
        pageviews: number
        errors: number
    }
    timeline: SessionTimelineItem[]
}

export interface TimeseriesPoint {
    date: string
    value: number
}

export interface TimeseriesData {
    metric: 'errors' | 'loads'
    windowDays: number
    points: TimeseriesPoint[]
    baseline: { mean: number; lower: number; upper: number }
    markers: { date: string; release: string }[]
}

export interface ExplorerRow {
    url: string
    loads: number
    errors: number
    errorRate: number | null
    lcpP75: number | null
    lcpRating: 'good' | 'needs-improvement' | 'poor' | null
    health: 'healthy' | 'warning' | 'unhealthy' | 'no-data'
    spark: number[]
}

export interface ExplorerData {
    source: UsageSource | null
    connected: boolean
    windowDays: number
    rows: ExplorerRow[]
}

export interface FlowNode {
    url: string
    visits: number
}

export interface FlowEdge {
    from: string
    to: string
    count: number
}

export interface FlowData {
    windowDays: number
    nodes: FlowNode[]
    edges: FlowEdge[]
}

export interface FeatureFlowNode {
    feature: string
    count: number
    errorCount: number
    avgDurationMs: number | null
}

export interface FeatureFlowData {
    windowDays: number
    nodes: FeatureFlowNode[]
    edges: FlowEdge[]
}

export type VitalRating = 'good' | 'needs-improvement' | 'poor'

export interface VitalMetricSummary {
    metric: string
    sampleCount: number
    p75: number | null
    rating: VitalRating | null
    good: number
    needsImprovement: number
    poor: number
}

export interface VitalPage {
    url: string
    sampleCount: number
    metrics: Record<string, { p75: number | null; rating: VitalRating | null }>
}

export interface ExperienceMetrics {
    source: UsageSource | null
    connected: boolean
    windowDays: number
    totalSamples: number
    metrics: VitalMetricSummary[]
    pages: VitalPage[]
}

export interface UsageTopPage {
    url: string
    views: number
    visitors: number
    lastSeenAt: string | null
}

export interface UsageTopEvent {
    name: string
    count: number
    visitors: number
    lastSeenAt: string | null
}

export interface ErrorIssue {
    id: string
    pipelineId: string
    fingerprint: string
    title: string
    level: 'error' | 'warning'
    status: 'unresolved' | 'resolved' | 'ignored'
    eventCount: number
    lastRelease: string | null
    firstSeenAt: string | null
    lastSeenAt: string | null
    affectedSessions?: number
}

export interface IssueTrend {
    direction: 'up' | 'down' | 'flat'
    recent: number
    prior: number
    changePct: number | null
}

export interface IssueObject {
    id: string
    fingerprint: string
    title: string
    level: 'error' | 'warning'
    status: 'unresolved' | 'resolved' | 'ignored'
    errorType: string | null
    lastRelease: string | null
    firstSeenAt: string | null
    lastSeenAt: string | null
    totalOccurrences: number
    occurrences: number
    affectedUsers: number
    affectedSessions: number
    trend: IssueTrend
}

export interface DimensionFacetItem {
    value: string
    count: number
}

export interface DimensionFacets {
    errorType: DimensionFacetItem[]
    platform: DimensionFacetItem[]
}

export interface IssuesMetrics {
    source: UsageSource | null
    connected: boolean
    windowDays: number
    summary: {
        openIssues: number
        affectedUsers: number
        occurrences: number
    }
    issues: IssueObject[]
    facets: DimensionFacets
    filters: { errorType: string | null; platform: string | null }
}

export interface ReleaseErrorStat {
    release: string
    errors: number
    affectedUsers: number
    affectedSessions: number
    sessions: number
    errorsPerSession: number | null
    firstSeenAt: string | null
    lastSeenAt: string | null
}

export interface ErrorsByReleaseMetrics {
    source: UsageSource | null
    connected: boolean
    windowDays: number
    releases: ReleaseErrorStat[]
}

export interface IssueFacetItem {
    value: string
    count: number
    users: number
}

export interface IssueSample {
    message: string
    stack: string | null
    level: string
    handled: boolean | null
    url: string | null
    release: string | null
    occurredAt: string | null
}

export interface IssueDetailData {
    issue: IssueObject
    sample: IssueSample | null
    facets: { release: IssueFacetItem[]; url: IssueFacetItem[] }
    recentOccurrences: ErrorEvent[]
    windowDays: number
}

export interface AffectedSession {
    sessionId: string
    visitorId: string | null
    userRef: string | null
    identified: boolean
    occurrences: number
    firstSeenAt: string | null
    lastSeenAt: string | null
}

export interface IssueSessionsData {
    issueId: string
    windowDays: number
    sessions: AffectedSession[]
}

export interface ErrorEvent {
    id: string
    pipelineId: string
    groupId: string | null
    fingerprint: string
    message: string
    stack: string | null
    level: 'error' | 'warning'
    handled: boolean | null
    url: string | null
    release: string | null
    traceId?: string | null
    spanId?: string | null
    visitorId: string | null
    sessionId: string | null
    userId: string | null
    metadata: Record<string, unknown>
    occurredAt: string | null
    receivedAt: string | null
}

export interface TraceSpan {
    id: string
    traceId: string
    spanId: string
    parentSpanId: string | null
    name: string
    kind: string
    service: string | null
    feature: string | null
    platform: string | null
    status: string | null
    release: string | null
    environment: string | null
    durationMs: number | null
    startAt: string | null
    attributes: Record<string, unknown>
    depth: number
}

export interface TraceLog {
    id: string
    level: string
    message: string
    url: string | null
    spanId: string | null
    occurredAt: string | null
}

export interface TraceData {
    traceId: string
    spans: TraceSpan[]
    errors: ErrorEvent[]
    logs: TraceLog[]
    summary: {
        spanCount: number
        errorCount: number
        logCount: number
        services: string[]
        hasServer: boolean
        durationMs: number | null
    }
}

export interface ErrorDaily {
    date: string
    errors: number
}

export interface ErrorMetrics {
    source: UsageSource | null
    connected: boolean
    totalErrors: number
    lastSeenAt: string | null
    windowDays: number
    summary14d: {
        errors: number
        openIssues: number
        affectedSessions: number
        errorsPerSession: number | null
    }
    daily: ErrorDaily[]
    issues: ErrorIssue[]
    recentErrors: ErrorEvent[]
}

export interface CorrelationDay {
    date: string
    visitors: number
    pageviews: number
    signups: number
    errors: number
}

export interface CorrelationMetrics {
    days: CorrelationDay[]
    insights: string[]
    windowDays: number
    summary: {
        mrrCents: number | null
        mrrChangePct: number | null
        signupsChangePct: number | null
        errorsPerSession14d: number | null
        errorsPerSessionWindowDays: number
    }
}

export interface AlertSettings {
    newIssueEnabled: boolean
    errorSpikeEnabled: boolean
    signupsDropEnabled: boolean
    revenueDropEnabled: boolean
    errorSpikeMultiplier: number
    signupsDropPct: number
    revenueDropPct: number
}

export interface RevenueSource {
    id: string
    pipelineId: string
    provider: 'stripe'
    status: 'not_connected' | 'connected' | 'needs_attention'
    accountMode: 'connected' | 'first_party'
    providerAccountId: string | null
    providerAccountLabel: string | null
    currentMrrCents: number | null
    revenueEngine: 'subscription' | 'invoice'
    subscriptionMrrCents: number | null
    invoiceMrrCents: number | null
    newCustomers30d: number | null
    churnedCustomers30d: number | null
    churnRate30d: number | null
    revenueSnapshot: Record<string, unknown>
    invoiceRevenueSnapshot: Record<string, unknown>
    grossMarginPct: number | null
    cacCents: number | null
    profitMarginPct: number | null
    connectedAt: string | null
    lastSyncedAt: string | null
    createdAt: string | null
    updatedAt: string | null
}

export interface RevenueMovementComponents {
    startingMrrCents: number
    currentMrrCents: number
    newMrrCents: number
    expansionMrrCents: number
    contractionMrrCents: number
    churnMrrCents: number
    reactivationMrrCents: number
    customersAtStart: number
    activeAccounts: number
    newCustomers: number
    churnedCustomers: number
    movementCounts: Record<string, number>
}

export interface RevenueRatios {
    grossMrrChurn: number | null
    netMrrChurn: number | null
    nrr: number | null
    grr: number | null
    logoChurn: number | null
    quickRatio: number | null
    arpaCents: number | null
    mrrGrowthRate: number | null
}

export interface RevenueUnitEconomics {
    grossMarginPct: number
    grossMarginEstimated: boolean
    ltvCents: number | null
    ltvCapMonths: number
    cacCents: number | null
    cacPaybackMonths: number | null
    ltvCac: number | null
    profitMarginPct: number | null
    ruleOf40: number | null
    ruleOf40Estimated: boolean
}

export interface RevenueDerivedMetrics {
    windowDays: number
    components: RevenueMovementComponents
    ratios: RevenueRatios
    unitEconomics: RevenueUnitEconomics
    warnings: string[]
}

export interface RevenueMetrics {
    source: RevenueSource | null
    connected: boolean
    summary: {
        mrrCents: number | null
        subscriptionMrrCents: number | null
        invoiceMrrCents: number | null
        revenueEngine: 'subscription' | 'invoice'
        newCustomers30d: number | null
        churnedCustomers30d: number | null
        churnRate30d: number | null
        windowDays: number
    }
    metrics: RevenueDerivedMetrics | null
}

// Usage->revenue correlation (D1), from GET /portfolio/{id}/insights/revenue-correlation.
export interface CorrelationCandidate {
    behavior: string
    a: number
    b: number
    c: number
    d: number
    oddsRatio: number
    direction?: 'expansion' | 'churn'
    expandLikelihood?: number
    churnLikelihood?: number
    pValue?: number | null
    reason?: string
}

export interface RevenueCorrelation {
    outcomeWindowDays: number
    observationWindowDays: number
    resolvedCustomers: number
    method: string
    cohort: { labeled: number; positive: number; negative: number }
    candidates: CorrelationCandidate[]
    dropped: CorrelationCandidate[]
    caveats: string[]
}
