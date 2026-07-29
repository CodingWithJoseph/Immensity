export type SignalWorkspaceView = 'overview' | 'evidence' | 'conversation'

export type SignalAnalysisStatus =
    | 'queued'
    | 'generating'
    | 'ready'
    | 'stale'
    | 'insufficient_evidence'
    | 'failed'

export type SignalClaimKind = 'observed' | 'inferred' | 'user_confirmed'
export type SignalEvidenceStance = 'supporting' | 'contradictory' | 'ambiguous' | 'excluded'
export type SignalProblemUnitKind = 'cause' | 'core_problem' | 'symptom' | 'consequence' | 'workaround'
export type SignalConfidence = 'low' | 'medium' | 'high'

export interface SignalProjectContext {
    pipelineId: string
    projectName: string
    clusterName: string | null
    sourceFingerprint: string | null
    analyzedAt: string | null
    sourceUpdatedAt: string | null
}

export interface SignalAnalysisProgress {
    step:
        | 'queued'
        | 'preparing_evidence'
        | 'analyzing_problem'
        | 'mapping_context'
        | 'validating_citations'
        | 'saving'
    label: string
}

export interface SignalMetricSnapshot {
    signalStrength: number | null
    momentum30d: number | null
    freshnessDays: number | null
    evidenceCount: number
    authorCount: number | null
    sourceDiversity: number | null
}

export interface SignalClaim {
    id: string
    text: string
    kind: SignalClaimKind
    confidence: SignalConfidence
    evidenceIds: string[]
    confirmed: boolean
    rejected: boolean
}

export interface SignalThesis {
    statement: string
    audience: string | null
    context: string | null
    coreProblem: string
    consequence: string | null
    workaround: string | null
    claimIds: string[]
    confirmed: boolean
}

export interface SignalProblemUnit {
    id: string
    parentId: string | null
    title: string
    description: string | null
    kind: SignalProblemUnitKind
    audienceIds: string[]
    claimIds: string[]
    evidenceIds: string[]
    evidenceCount: number
    sourceDiversity: number | null
    frequency: SignalConfidence | null
    intensity: SignalConfidence | null
    momentum30d: number | null
    confidence: SignalConfidence
    pinned: boolean
    rejected: boolean
}

export interface SignalAudience {
    id: string
    name: string
    description: string
    kind: SignalClaimKind
    language: string[]
    communities: string[]
    reachChannels: string[]
    evidenceIds: string[]
    unknowns: string[]
}

export interface SignalAlternative {
    id: string
    name: string
    category: 'manual' | 'software' | 'service' | 'avoidance' | 'none'
    reasonUsed: string | null
    weakness: string | null
    evidenceIds: string[]
}

export interface SignalAssumption {
    id: string
    question: string
    whyItMatters: string
    category: 'problem' | 'audience' | 'behavior' | 'access' | 'willingness_to_pay' | 'feasibility'
    evidenceStrength: SignalConfidence
    evidenceIds: string[]
    resolutionEvidence: string
    problemUnitId: string | null
    resolved: boolean
}

export interface SignalEvidenceRecord {
    id: string
    title: string
    excerpt: string
    body: string | null
    platform: string | null
    community: string | null
    author: string | null
    observedAt: string | null
    score: number | null
    commentCount: number | null
    sourceUrl: string | null
    stance: SignalEvidenceStance
    claimIds: string[]
    problemUnitIds: string[]
    relevanceReason: string | null
    pinned: boolean
    userNote: string | null
}

export interface SignalRecommendedFocus {
    problemUnitId: string | null
    title: string
    rationale: string
    supported: string[]
    risky: string[]
    suggestedValidationStep: string
}

export interface SignalCase {
    version: number
    status: SignalAnalysisStatus
    progress: SignalAnalysisProgress | null
    safeError: string | null
    project: SignalProjectContext
    metrics: SignalMetricSnapshot
    thesis: SignalThesis | null
    claims: SignalClaim[]
    problemUnits: SignalProblemUnit[]
    audiences: SignalAudience[]
    alternatives: SignalAlternative[]
    assumptions: SignalAssumption[]
    evidence: SignalEvidenceRecord[]
    recommendedFocus: SignalRecommendedFocus | null
}

export interface SignalConversationSummary {
    id: string
    title: string
    updatedAt: string
    archived: boolean
}

export interface SignalCitation {
    evidenceId: string
    label: string
}

export interface SignalProposal {
    id: string
    kind:
        | 'revise_thesis'
        | 'create_problem_unit'
        | 'update_problem_unit'
        | 'merge_problem_units'
        | 'create_audience'
        | 'create_assumption'
        | 'link_evidence'
        | 'validation_handoff'
    title: string
    summary: string
    evidenceIds: string[]
    status: 'pending' | 'accepted' | 'rejected'
    targetKind?: string | null
    targetId?: string | null
    changes?: Record<string, unknown>
}

export interface SignalConversationTurn {
    id: string
    role: 'user' | 'assistant'
    text: string
    createdAt: string
    citations: SignalCitation[]
    proposal: SignalProposal | null
    insufficientEvidence: boolean
}

export interface SignalConversation {
    id: string
    title: string
    turns: SignalConversationTurn[]
}
