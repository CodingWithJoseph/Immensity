'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
    DndContext, DragEndEvent, DragOverEvent, DragStartEvent, DragOverlay,
    PointerSensor, useSensor, useSensors, useDroppable,
} from '@dnd-kit/core'
import {
    SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDraggable } from '@dnd-kit/core'
import toast from 'react-hot-toast'
import { fetchJson } from '@/lib/fetchJson'
import { SkeletonCards } from '@/components/Skeleton'
import { useWorkspace } from '@/app/(core)/dashboard/contexts/WorkspaceContext'
import ProjectTimelineBar from '@/app/(core)/dashboard/components/ProjectTimelineBar'
import { PipelineCard } from '@/lib/types/cluster'
import { dueStatus, dueLabel, duePillClass } from '@/lib/dueDates'

interface Problem {
    id: string
    title: string
    description: string | null
    sourcePostId: string | null
    position: number
}

interface Task {
    id: string
    title: string
    description: string | null
    status: 'todo' | 'in_progress' | 'done'
    position: number
    problemId: string | null
    dueDate: string | null
}

// Min/max bounds for a task due-date input, anchoring it to the project's
// launch window when one is set ('YYYY-MM-DD' or undefined).
interface DueBounds {
    min?: string
    max?: string
}

const STATUS_CYCLE: Record<string, Task['status']> = {
    todo: 'in_progress', in_progress: 'done', done: 'todo',
}
const STATUS_LABEL: Record<string, string> = {
    todo: 'To Do', in_progress: 'In Progress', done: 'Done',
}
const STATUS_CLASS: Record<string, string> = {
    todo: 'bg-(--status-todo-bg) text-(--status-todo-text)',
    in_progress: 'bg-(--status-progress-bg) text-(--status-progress-text)',
    done: 'bg-(--status-done-bg) text-(--status-done-text)',
}

function DraggableProblemCard({ problem, inUse }: { problem: Problem; inUse: boolean }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `problem:${problem.id}`,
        data: { type: 'problem', problem },
        disabled: inUse,
    })
    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }}
            {...attributes} {...listeners}
            className={`border border-(--color-border) rounded-md p-3 select-none ${inUse ? 'opacity-50 cursor-default' : 'cursor-grab hover:border-(--color-text-muted) hover:bg-(--color-bg) transition-colors'}`}
        >
            <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-(--color-text) leading-snug">{problem.title}</p>
                {inUse && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-(--color-border) text-(--color-text-muted) shrink-0">In use</span>}
            </div>
            {problem.description && <p className="text-xs text-(--color-text-muted) mt-1 line-clamp-2">{problem.description}</p>}
        </div>
    )
}

function NewTaskArea({ onAdd, prefill, onClearPrefill, dueBounds }: {
    onAdd: (title: string, description: string, problemId: string | null, dueDate: string | null) => Promise<void>
    prefill: { title: string; description: string; problemId: string } | null
    onClearPrefill: () => void
    dueBounds: DueBounds
}) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [problemId, setProblemId] = useState<string | null>(null)
    const [dueDate, setDueDate] = useState('')
    const [adding, setAdding] = useState(false)
    const { isOver, setNodeRef } = useDroppable({ id: 'new-task-drop' })

    useEffect(() => {
        if (!prefill) return
        const run = async () => {
            setTitle(prefill.title)
            setDescription(prefill.description)
            setProblemId(prefill.problemId)
            onClearPrefill()
        }
        void run()
    }, [prefill, onClearPrefill])

    async function handleAdd() {
        if (!title.trim()) return
        setAdding(true)
        await onAdd(title.trim(), description.trim(), problemId, dueDate || null)
        setTitle(''); setDescription(''); setProblemId(null); setDueDate(''); setAdding(false)
    }

    return (
        <div ref={setNodeRef} className={`border-2 rounded-md p-4 flex flex-col gap-3 transition-colors ${isOver ? 'border-(--color-text) bg-(--color-bg)' : 'border-(--color-border)'}`}>
            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">
                New Task {isOver && <span className="text-(--color-text) normal-case tracking-normal font-normal">- drop to attach problem</span>}
            </p>
            <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void handleAdd() }}
                   placeholder="Task title (required)" className="text-sm border border-(--color-border) rounded-md px-3 py-2 bg-(--color-bg) text-(--color-text) focus:outline-none focus:ring-2 focus:ring-(--color-text)" />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={2}
                      className="text-sm border border-(--color-border) rounded-md px-3 py-2 bg-(--color-bg) text-(--color-text) focus:outline-none focus:ring-2 focus:ring-(--color-text) resize-none" />
            <label className="flex items-center gap-2 text-xs text-(--color-text-muted)">
                Due date
                <input type="date" value={dueDate} min={dueBounds.min} max={dueBounds.max}
                       onChange={e => setDueDate(e.target.value)}
                       className="text-sm border border-(--color-border) rounded-md px-2 py-1 bg-(--color-bg) text-(--color-text) focus:outline-none focus:ring-2 focus:ring-(--color-text)" />
                {dueDate && (
                    <button type="button" onClick={() => setDueDate('')} className="hover:text-(--color-text)" title="Clear due date">Clear</button>
                )}
            </label>
            <button onClick={handleAdd} disabled={!title.trim() || adding}
                    className="self-start rounded-md bg-(--color-button) px-4 py-2 text-sm text-(--color-on-button) transition-colors hover:bg-(--color-button-hover) disabled:opacity-40">
                {adding ? 'Adding...' : 'Add Task'}
            </button>
        </div>
    )
}

function SortableTaskCard({ task, problems, onDelete, onUpdate, isDropTarget, isRejecting, dueBounds }: {
    task: Task; problems: Problem[]
    onDelete: (id: string) => void
    onUpdate: (id: string, updates: Partial<Task>) => Promise<void>
    isDropTarget: boolean; isRejecting: boolean
    dueBounds: DueBounds
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { type: 'task' } })
    const { isOver, setNodeRef: setDropRef } = useDroppable({ id: `task-drop:${task.id}` })
    const combinedRef = useCallback((node: HTMLDivElement | null) => { setNodeRef(node); setDropRef(node) }, [setNodeRef, setDropRef])
    const attachedProblem = problems.find(p => p.id === task.problemId)

    async function cycleStatus() {
        await onUpdate(task.id, { status: STATUS_CYCLE[task.status] ?? 'todo' })
    }

    let borderClass = 'border-(--color-border)'
    if (isRejecting) borderClass = 'border-(--color-text)'
    else if (isOver || isDropTarget) borderClass = 'border-(--color-text) bg-(--color-bg)'

    return (
        <div ref={combinedRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
             className={`border-2 rounded-md p-4 flex gap-3 transition-colors bg-(--color-surface) ${borderClass}`}>
            <button {...attributes} {...listeners} className="shrink-0 text-(--color-text-muted) hover:text-(--color-text) cursor-grab mt-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01"/>
                </svg>
            </button>
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium text-(--color-text) ${task.status === 'done' ? 'line-through opacity-60' : ''}`}>{task.title}</p>
                {task.description && <p className="text-xs text-(--color-text-muted) mt-1">{task.description}</p>}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <button onClick={cycleStatus} className={`text-xs px-2 py-0.5 rounded-md font-medium ${STATUS_CLASS[task.status]}`}>{STATUS_LABEL[task.status]}</button>
                    {attachedProblem && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-(--color-bg) text-(--color-text-muted)">
                            <span className="truncate max-w-32">{attachedProblem.title}</span>
                            <button onClick={() => onUpdate(task.id, { problemId: null })} className="hover:opacity-60" title="Detach problem">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </span>
                    )}
                    {task.dueDate ? (
                        <span className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${duePillClass(dueStatus(task.dueDate, task.status))}`}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                                <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
                            </svg>
                            {dueLabel(task.dueDate, task.status)}
                            <input type="date" value={task.dueDate} min={dueBounds.min} max={dueBounds.max}
                                   onChange={e => onUpdate(task.id, { dueDate: e.target.value || null })}
                                   className="w-4 cursor-pointer bg-transparent text-transparent outline-none" title="Change due date" aria-label="Change due date" />
                            <button onClick={() => onUpdate(task.id, { dueDate: null })} className="hover:opacity-60" title="Clear due date">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </span>
                    ) : (
                        <label className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border border-dashed border-(--color-border) text-(--color-text-muted) cursor-pointer transition-colors hover:border-(--color-border-strong) hover:text-(--color-text)" title="Set due date">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            Due date
                            <input type="date" value="" min={dueBounds.min} max={dueBounds.max}
                                   onChange={e => onUpdate(task.id, { dueDate: e.target.value || null })}
                                   className="w-0 opacity-0" aria-label="Set due date" />
                        </label>
                    )}
                </div>
            </div>
            <button onClick={() => onDelete(task.id)} className="shrink-0 text-(--color-text-muted) hover:text-(--color-text) transition-colors p-1 rounded mt-0.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
            </button>
        </div>
    )
}

export default function TasksPage() {
    const { selectedPipelineId: workspacePipelineId, hydrated } = useWorkspace()
    const [pipelineId, setPipelineId] = useState<string | null>(null)
    const [problems, setProblems] = useState<Problem[]>([])
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(false)
    const [activeId, setActiveId] = useState<string | null>(null)
    const [overTaskId, setOverTaskId] = useState<string | null>(null)
    const [rejectingTaskId, setRejectingTaskId] = useState<string | null>(null)
    const [newTaskPrefill, setNewTaskPrefill] = useState<{ title: string; description: string; problemId: string } | null>(null)
    // Bounds for due-date inputs, anchoring them to the project's launch window.
    const [dueBounds, setDueBounds] = useState<DueBounds>({})
    // Bumped after any due-date / status / delete change to refresh the header roll-up.
    const [deadlineReload, setDeadlineReload] = useState(0)
    const rejectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

    useEffect(() => {
        if (hydrated && workspacePipelineId && workspacePipelineId !== pipelineId) setPipelineId(workspacePipelineId)
    }, [hydrated, pipelineId, workspacePipelineId])

    useEffect(() => {
        if (!pipelineId || !hydrated) return
        const run = async () => {
            setLoading(true)
            try {
                const [pj, tj, card] = await Promise.all([
                    fetchJson<{ data: Problem[] }>(`/api/problems?pipeline_id=${pipelineId}`),
                    fetchJson<{ data: Task[] }>(`/api/tasks?pipeline_id=${pipelineId}`),
                    fetchJson<{ data: PipelineCard }>(`/api/pipeline/${pipelineId}`),
                ])
                setProblems(pj?.data ?? [])
                setTasks(tj?.data ?? [])
                const c = card?.data
                setDueBounds({
                    min: c?.timelineStart ? c.timelineStart.slice(0, 10) : undefined,
                    max: c?.timelineTargetLaunch ? c.timelineTargetLaunch.slice(0, 10) : undefined,
                })
            } finally {
                setLoading(false)
            }
        }
        void run()
    }, [pipelineId, hydrated])

    const usedProblemIds = new Set(tasks.map(t => t.problemId).filter(Boolean))
    const bumpDeadlines = () => setDeadlineReload(v => v + 1)

    async function handleAddTask(title: string, description: string, problemId: string | null, dueDate: string | null) {
        if (!pipelineId) return
        const data = await fetchJson<{ data: Task }>('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pipeline_id: pipelineId, title, description: description || null, problem_id: problemId, due_date: dueDate }),
        })
        if (data?.data) {
            setTasks(prev => [...prev, data.data])
            if (dueDate) bumpDeadlines()
        }
    }

    async function handleUpdateTask(id: string, updates: Partial<Task>) {
        const prev = tasks
        setTasks(prev.map(t => t.id === id ? { ...t, ...updates } : t))
        const body: Record<string, unknown> = {}
        if (updates.status !== undefined) body.status = updates.status
        if (updates.position !== undefined) body.position = updates.position
        if ('problemId' in updates) body.problem_id = updates.problemId
        if (updates.title !== undefined) body.title = updates.title
        if (updates.description !== undefined) body.description = updates.description
        if ('dueDate' in updates) body.due_date = updates.dueDate
        try {
            const res = await fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            if (!res.ok) throw new Error('update failed')
            if ('dueDate' in updates || updates.status !== undefined) bumpDeadlines()
        } catch {
            setTasks(prev)  // revert optimistic change
            toast.error('Could not save the task. Please try again.')
        }
    }

    async function handleDeleteTask(id: string) {
        const prev = tasks
        const removed = prev.find(t => t.id === id)
        setTasks(prev.filter(t => t.id !== id))
        try {
            const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('delete failed')
            if (removed?.dueDate) bumpDeadlines()
        } catch {
            setTasks(prev)  // restore the task we optimistically removed
            toast.error('Could not delete the task. Please try again.')
        }
    }

    function handleDragStart(event: DragStartEvent) { setActiveId(event.active.id as string) }

    function handleDragOver(event: DragOverEvent) {
        const { over } = event
        if (!over) { setOverTaskId(null); return }
        const overId = over.id as string
        if (overId.startsWith('task-drop:')) setOverTaskId(overId.replace('task-drop:', ''))
        else setOverTaskId(null)
    }

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        setActiveId(null); setOverTaskId(null)
        if (!over) return
        const activeIdStr = active.id as string
        const overIdStr = over.id as string
        const activeData = active.data.current as { type: string; problem?: Problem } | undefined

        if (activeData?.type === 'problem' && overIdStr === 'new-task-drop') {
            const p = activeData.problem!
            setNewTaskPrefill({ title: p.title, description: p.description ?? '', problemId: p.id })
            return
        }

        if (activeData?.type === 'problem' && overIdStr.startsWith('task-drop:')) {
            const taskId = overIdStr.replace('task-drop:', '')
            const task = tasks.find(t => t.id === taskId)
            if (!task) return
            if (task.problemId) {
                setRejectingTaskId(taskId)
                if (rejectTimeoutRef.current) clearTimeout(rejectTimeoutRef.current)
                rejectTimeoutRef.current = setTimeout(() => setRejectingTaskId(null), 800)
                return
            }
            await handleUpdateTask(taskId, { problemId: activeData.problem!.id })
            return
        }

        if (activeData?.type === 'task' && !activeIdStr.startsWith('problem:')) {
            if (activeIdStr === overIdStr) return
            const oldIndex = tasks.findIndex(t => t.id === activeIdStr)
            const newIndex = tasks.findIndex(t => t.id === overIdStr)
            if (oldIndex === -1 || newIndex === -1) return
            const prev = tasks
            setTasks(arrayMove(tasks, oldIndex, newIndex))
            try {
                const res = await fetch(`/api/tasks/${activeIdStr}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ position: newIndex }) })
                if (!res.ok) throw new Error('reorder failed')
            } catch {
                setTasks(prev)  // revert the optimistic reorder
                toast.error('Could not reorder tasks. Please try again.')
            }
        }
    }

    const todoCount = tasks.filter(t => t.status === 'todo').length
    const inProgressCount = tasks.filter(t => t.status === 'in_progress').length
    const doneCount = tasks.filter(t => t.status === 'done').length

    return (
        <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col overflow-hidden">
            {!pipelineId && (
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm text-(--color-text-muted)">Select a project from the top bar to plan its tasks.</p>
                </div>
            )}

            {pipelineId && loading && (
                <div className="flex-1 flex overflow-hidden">
                    <div className="w-3/5 px-6 py-6 border-r border-(--color-border)">
                        <SkeletonCards count={4} className="grid-cols-1" cardClassName="h-20" />
                    </div>
                    <div className="w-2/5 px-6 py-6">
                        <SkeletonCards count={3} className="grid-cols-1" cardClassName="h-16" />
                    </div>
                </div>
            )}

            {pipelineId && !loading && (
                <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
                    <div className="flex-1 flex overflow-hidden">
                        <div className="w-3/5 flex flex-col overflow-y-auto px-6 py-6 gap-4 border-r border-(--color-border)">
                            <ProjectTimelineBar pipelineId={pipelineId} reloadToken={deadlineReload} />
                            <div className="flex items-center gap-3">
                                <h2 className="text-sm font-semibold text-(--color-text)">Tasks</h2>
                                <span className="text-xs text-(--color-text-muted)">{todoCount} to do / {inProgressCount} in progress / {doneCount} done</span>
                            </div>
                            <NewTaskArea onAdd={handleAddTask} prefill={newTaskPrefill} onClearPrefill={() => setNewTaskPrefill(null)} dueBounds={dueBounds} />
                            {tasks.length === 0 && (
                                <div className="border border-(--color-border) rounded-md p-8 text-center">
                                    <p className="text-sm text-(--color-text-muted)">Tasks will appear here once you add work or drag in a problem.</p>
                                </div>
                            )}
                            <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                <div className="flex flex-col gap-3">
                                    {tasks.map(task => (
                                        <SortableTaskCard key={task.id} task={task} problems={problems}
                                                          onDelete={handleDeleteTask} onUpdate={handleUpdateTask}
                                                          isDropTarget={overTaskId === task.id} isRejecting={rejectingTaskId === task.id}
                                                          dueBounds={dueBounds} />
                                    ))}
                                </div>
                            </SortableContext>
                        </div>
                        <div className="w-2/5 flex flex-col overflow-y-auto px-6 py-6 gap-4">
                            <h2 className="text-sm font-semibold text-(--color-text)">Problems</h2>
                            {problems.length === 0 && (
                                <div className="border border-(--color-border) rounded-md p-6 text-center">
                                    <p className="text-xs text-(--color-text-muted)">Problems from Breakdown will appear here when they are ready to turn into tasks.</p>
                                </div>
                            )}
                            <div className="flex flex-col gap-2">
                                {problems.map(problem => (
                                    <DraggableProblemCard key={problem.id} problem={problem} inUse={usedProblemIds.has(problem.id)} />
                                ))}
                            </div>
                        </div>
                    </div>
                    <DragOverlay>
                        {activeId?.startsWith('problem:') && (() => {
                            const p = problems.find(p => `problem:${p.id}` === activeId)
                            if (!p) return null
                            return (
                                <div className="border border-(--color-text) bg-(--color-bg) rounded-md p-3 shadow-lg opacity-90">
                                    <p className="text-xs font-medium text-(--color-text)">{p.title}</p>
                                </div>
                            )
                        })()}
                    </DragOverlay>
                </DndContext>
            )}
        </div>
    )
}
