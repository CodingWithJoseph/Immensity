import type { PipelineCard } from '@/lib/types/cluster'
import type { Goal } from '@/lib/types/goals'
import { DISCOVERY_FRACTION } from '@/lib/timeline'
import { dueStatus } from '@/lib/dueDates'
import { addDaysToKey } from '@/lib/calendar'
import { goalDisplayName, goalTargetPhrase } from '@/lib/goalsView'

export interface CalendarTask {
    id: string
    title: string
    status: 'todo' | 'in_progress' | 'done'
    dueDate: string | null
}

// What an event *is* (drives its icon) vs. where it stands (drives its dot colour).
export type CalendarEventType = 'phase' | 'goal-target' | 'milestone' | 'task' | 'launch'
export type CalendarEventStatus = 'upcoming' | 'due-soon' | 'completed' | 'overdue'

export interface CalendarEvent {
    key: string
    label: string
    type: CalendarEventType
    status: CalendarEventStatus
    // Derived from status, so the simple dashboard calendar card keeps working.
    dotClass: string
    detail?: string
}

export interface WorkspaceCalendarProject {
    card: PipelineCard
    tasks: CalendarTask[]
}

export function statusDotClass(status: CalendarEventStatus): string {
    switch (status) {
        case 'overdue': return 'bg-(--color-error)'
        case 'due-soon': return 'bg-(--color-warning)'
        case 'completed': return 'bg-(--color-success)'
        default: return 'bg-(--color-text-faint)'
    }
}

export function taskDotClass(task: CalendarTask): string {
    return statusDotClass(taskStatus(task))
}

function taskStatus(task: CalendarTask): CalendarEventStatus {
    if (task.status === 'done') return 'completed'
    switch (dueStatus(task.dueDate, task.status)) {
        case 'overdue': return 'overdue'
        case 'due_soon': return 'due-soon'
        default: return 'upcoming'
    }
}

function dayKey(now: Date): string {
    const y = now.getFullYear(), m = `${now.getMonth() + 1}`.padStart(2, '0'), d = `${now.getDate()}`.padStart(2, '0')
    return `${y}-${m}-${d}`
}

// Group the project's timeline phases, goal targets/milestones, and task due dates
// by 'YYYY-MM-DD'. Each event carries a type (icon) and status (dot colour) so the
// month view can distinguish "goal target" from "overdue" etc. Upcoming goal tiers
// (soft estimates) are omitted so the calendar never shows a fabricated deadline.
export function buildEvents(tasks: CalendarTask[], card: PipelineCard | null, goals: Goal[] = [], now: Date = new Date()): Record<string, CalendarEvent[]> {
    const events: Record<string, CalendarEvent[]> = {}
    const today = dayKey(now)
    const push = (key: string, e: Omit<CalendarEvent, 'dotClass'>) => {
        (events[key] ??= []).push({ ...e, dotClass: statusDotClass(e.status) })
    }
    const boundaryStatus = (key: string): CalendarEventStatus => (key < today ? 'completed' : 'upcoming')

    if (card?.timelineStart && card.timelineDays) {
        const startKey = card.timelineStart.slice(0, 10)
        push(startKey, { key: 'phase-start', label: 'Project start', type: 'phase', status: boundaryStatus(startKey) })
        const buildKey = addDaysToKey(startKey, Math.round(card.timelineDays * DISCOVERY_FRACTION))
        push(buildKey, { key: 'phase-build', label: 'Build begins', type: 'phase', status: boundaryStatus(buildKey) })
        if (!card.launchedAt && card.timelineTargetLaunch) {
            const launchKey = card.timelineTargetLaunch.slice(0, 10)
            push(launchKey, { key: 'launch-target', label: 'Launch target', type: 'launch', status: launchKey < today ? 'overdue' : 'upcoming' })
        }
    }
    if (card?.launchedAt) push(card.launchedAt.slice(0, 10), { key: 'launched', label: 'Launched', type: 'launch', status: 'completed' })

    for (const goal of goals) {
        const name = goalDisplayName(goal)
        const active = goal.activeTier
        if (active?.targetDate) {
            const status: CalendarEventStatus = active.daysLeft == null ? 'upcoming'
                : active.daysLeft < 0 ? 'overdue' : active.daysLeft <= 7 ? 'due-soon' : 'upcoming'
            push(active.targetDate.slice(0, 10), { key: `goal-${goal.id}-target`, label: goalTargetPhrase(goal.metricKey, active.threshold, active.label), type: 'goal-target', status, detail: name })
        }
        for (const m of goal.milestones) {
            push(m.achievedAt.slice(0, 10), { key: `goal-${goal.id}-m${m.tierIndex}`, label: goalTargetPhrase(goal.metricKey, m.threshold, m.label), type: 'milestone', status: 'completed', detail: name })
        }
    }

    for (const task of tasks) {
        if (!task.dueDate) continue
        push(task.dueDate, { key: `task-${task.id}`, label: task.title, type: 'task', status: taskStatus(task) })
    }
    return events
}

export function buildWorkspaceEvents(projects: WorkspaceCalendarProject[]): Record<string, CalendarEvent[]> {
    const events: Record<string, CalendarEvent[]> = {}

    for (const { card, tasks } of projects) {
        const projectName = card.displayName ?? card.name
        const projectEvents = buildEvents(tasks, card)
        for (const [date, items] of Object.entries(projectEvents)) {
            const labelled = items.map(item => ({ ...item, key: `${card.id}-${item.key}`, label: `${projectName}: ${item.label}`, detail: item.detail ?? projectName }))
            ;(events[date] ??= []).push(...labelled)
        }
    }

    return events
}
