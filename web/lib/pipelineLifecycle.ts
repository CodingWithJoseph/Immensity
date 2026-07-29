import type { PipelineCard, PipelineStage } from '@/lib/types/cluster'

export type PipelineLifecycleStage = 'watching' | 'building' | 'launched'
export type ReadinessStatus = 'on-track' | 'needs-attention' | 'at-risk'

export interface ReadinessProblem {
    id: string
}

export interface ReadinessTask {
    id: string
    problemId: string | null
    status: 'todo' | 'in_progress' | 'done'
}

export interface ProjectReadiness {
    target: number
    verifiedProblems: number
    verifiedTasks: number
    builtTasks: number
    verifiedPairs: number
    percent: number
    status: ReadinessStatus
    statusLabel: string
}

export const READINESS_TARGET = 20

export function lifecycleStage(card: Pick<PipelineCard, 'stage' | 'launchedAt'>): PipelineLifecycleStage {
    if (card.launchedAt) return 'launched'
    return card.stage === 'building' ? 'building' : 'watching'
}

export function lifecycleLabel(stage: PipelineLifecycleStage): string {
    if (stage === 'building') return 'Building'
    if (stage === 'launched') return 'Launched'
    return 'Watching'
}

export function persistedStage(stage: PipelineLifecycleStage): PipelineStage | null {
    if (stage === 'watching') return 'watching'
    if (stage === 'building') return 'building'
    return null
}

export function projectReadiness(
    problems: ReadinessProblem[],
    tasks: ReadinessTask[],
    overdue = false,
    target = READINESS_TARGET,
): ProjectReadiness {
    // The current data model has no separate verification flag. A saved problem
    // or task is therefore treated as verified; `done` is the explicit built state.
    const verifiedProblems = new Set(problems.map(problem => problem.id)).size
    const verifiedTasks = new Set(tasks.map(task => task.id)).size
    const builtTasks = tasks.filter(task => task.status === 'done').length
    const verifiedPairs = new Set(tasks.map(task => task.problemId).filter((id): id is string => Boolean(id))).size
    const percent = Math.min(100, Math.round((verifiedPairs / target) * 100))
    const status: ReadinessStatus = overdue
        ? 'at-risk'
        : verifiedPairs >= target
            ? 'on-track'
            : verifiedPairs >= Math.ceil(target / 2)
                ? 'needs-attention'
                : 'at-risk'
    const statusLabel = status === 'on-track' ? 'On track' : status === 'needs-attention' ? 'Needs attention' : 'At risk'

    return { target, verifiedProblems, verifiedTasks, builtTasks, verifiedPairs, percent, status, statusLabel }
}

const DAY_MS = 86_400_000

export function dayDistance(value: string | null | undefined, now = new Date()): number | null {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return Math.ceil((date.getTime() - now.getTime()) / DAY_MS)
}

export function daysSince(value: string | null | undefined, now = new Date()): number | null {
    const distance = dayDistance(value, now)
    return distance == null ? null : Math.max(0, -distance)
}

export function formatDate(value: string | null | undefined): string {
    if (!value) return 'Not set'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Not set'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatRelativeUpdate(value: string | null | undefined, now = new Date()): string {
    if (!value) return 'Not yet'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Not yet'
    const days = Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_MS))
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days} days ago`
}
