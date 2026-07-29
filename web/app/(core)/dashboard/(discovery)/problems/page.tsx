'use client'
import { useState, useEffect, useCallback } from 'react'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useWorkspace } from '@/app/(core)/dashboard/contexts/WorkspaceContext'
import toast from 'react-hot-toast'
import { fetchJson } from '@/lib/fetchJson'
import { SkeletonCards } from '@/components/Skeleton'
import ProjectTimelineBar from '@/app/(core)/dashboard/components/ProjectTimelineBar'

interface Problem {
    id: string
    pipelineId: string
    title: string
    description: string | null
    sourcePostId: string | null
    position: number
    createdAt: string
    embeddingReady?: boolean
    painLevel?: string | null
    urgencyLevel?: string | null
    frequencyScore?: number | null
    solutionSeekingScore?: number | null
    currentAlternatives?: string | null
    willingnessToPaySignal?: string | null
    buyerType?: string | null
}

function SortableProblemCard({
                                 problem,
                                 onDelete,
                                 onUpdate,
                             }: {
    problem: Problem
    onDelete: (id: string) => void
    onUpdate: (id: string, updates: Partial<Problem>) => void
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: problem.id })
    const [editing, setEditing] = useState(false)
    const [editTitle, setEditTitle] = useState(problem.title)
    const [editDesc, setEditDesc] = useState(problem.description ?? '')
    const [editPain, setEditPain] = useState(problem.painLevel ?? '')
    const [editUrgency, setEditUrgency] = useState(problem.urgencyLevel ?? '')
    const [editWtp, setEditWtp] = useState(problem.willingnessToPaySignal ?? '')
    const [confirmDelete, setConfirmDelete] = useState(false)

    // Captured once at mount: drives a transient "just created" badge.
    const [recentlyCreated] = useState(
        () => Date.now() - new Date(problem.createdAt).getTime() < 120000
    )

    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

    async function saveEdit() {
        const patch = {
            title: editTitle,
            description: editDesc || null,
            pain_level: editPain || null,
            urgency_level: editUrgency || null,
            willingness_to_pay_signal: editWtp || null,
        }
        try {
            const res = await fetch(`/api/problems/${problem.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patch),
            })
            if (!res.ok) throw new Error('update failed')
        } catch {
            toast.error('Could not save changes. Please try again.')
            return  // keep the editor open with the user's edits intact
        }
        onUpdate(problem.id, {
            title: editTitle,
            description: editDesc || null,
            painLevel: editPain || null,
            urgencyLevel: editUrgency || null,
            willingnessToPaySignal: editWtp || null,
        })
        setEditing(false)
    }

    async function handleDelete() {
        if (!confirmDelete) { setConfirmDelete(true); return }
        try {
            const res = await fetch(`/api/problems/${problem.id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('delete failed')
        } catch {
            toast.error('Could not delete the problem. Please try again.')
            return
        }
        onDelete(problem.id)
    }

    return (
        <div ref={setNodeRef} style={style} className="bg-(--color-surface) border border-(--color-border) rounded-md p-4 flex gap-3">
            <button {...attributes} {...listeners} className="shrink-0 text-(--color-text-muted) hover:text-(--color-text) cursor-grab mt-0.5" title="Drag to reorder">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01"/>
                </svg>
            </button>

            <div className="flex-1 min-w-0">
                {editing ? (
                    <div className="flex flex-col gap-2">
                        <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                               className="text-sm border border-(--color-border) rounded-md px-3 py-1.5 bg-(--color-bg) text-(--color-text) focus:outline-none focus:ring-2 focus:ring-(--color-text) w-full" />
                        <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2}
                                  className="text-sm border border-(--color-border) rounded-md px-3 py-1.5 bg-(--color-bg) text-(--color-text) focus:outline-none focus:ring-2 focus:ring-(--color-text) resize-none w-full" />
                        <div className="grid grid-cols-3 gap-2">
                            <select value={editPain} onChange={e => setEditPain(e.target.value)} className="text-xs border border-(--color-border) rounded-md px-2 py-1.5 bg-(--color-bg) text-(--color-text)">
                                <option value="">Pain -</option>
                                <option value="low">Pain: low</option>
                                <option value="medium">Pain: medium</option>
                                <option value="high">Pain: high</option>
                            </select>
                            <select value={editUrgency} onChange={e => setEditUrgency(e.target.value)} className="text-xs border border-(--color-border) rounded-md px-2 py-1.5 bg-(--color-bg) text-(--color-text)">
                                <option value="">Urgency -</option>
                                <option value="low">Urgency: low</option>
                                <option value="medium">Urgency: medium</option>
                                <option value="high">Urgency: high</option>
                            </select>
                            <select value={editWtp} onChange={e => setEditWtp(e.target.value)} className="text-xs border border-(--color-border) rounded-md px-2 py-1.5 bg-(--color-bg) text-(--color-text)">
                                <option value="">WTP -</option>
                                <option value="low">WTP: low</option>
                                <option value="medium">WTP: medium</option>
                                <option value="high">WTP: high</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={saveEdit} className="rounded-md bg-(--color-button) px-3 py-1.5 text-xs text-(--color-on-button) transition-colors hover:bg-(--color-button-hover)">Save</button>
                            <button onClick={() => setEditing(false)} className="text-xs px-3 py-1.5 rounded-md border border-(--color-border) text-(--color-text-muted) hover:text-(--color-text)">Cancel</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <p className="text-sm font-medium text-(--color-text)">{problem.title}</p>
                        {problem.description && <p className="text-xs text-(--color-text-muted) mt-1">{problem.description}</p>}
                        {problem.sourcePostId && <p className="text-xs text-(--color-text-muted) mt-1 font-mono truncate">Post: {problem.sourcePostId}</p>}
                        {(problem.painLevel || problem.urgencyLevel || problem.willingnessToPaySignal) && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {problem.painLevel && <span className="text-[10px] px-2 py-0.5 rounded-md bg-(--color-border) text-(--color-text-muted)">Pain: {problem.painLevel}</span>}
                                {problem.urgencyLevel && <span className="text-[10px] px-2 py-0.5 rounded-md bg-(--color-border) text-(--color-text-muted)">Urgency: {problem.urgencyLevel}</span>}
                                {problem.willingnessToPaySignal && <span className="text-[10px] px-2 py-0.5 rounded-md bg-(--color-border) text-(--color-text-muted)">WTP: {problem.willingnessToPaySignal}</span>}
                            </div>
                        )}
                        {problem.embeddingReady === false && recentlyCreated && (
                            <span className="inline-flex items-center gap-1.5 mt-2 text-[10px] text-(--color-text-muted)">
                                <span className="w-2 h-2 rounded-full bg-(--color-text-muted) animate-pulse" /> Analyzing...
                            </span>
                        )}
                    </>
                )}
            </div>

            {!editing && (
                <div className="flex items-start gap-1 shrink-0">
                    <button onClick={() => setEditing(true)} className="text-(--color-text-muted) hover:text-(--color-text) p-1 rounded" title="Edit">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button onClick={handleDelete} className={`p-1 rounded transition-colors ${confirmDelete ? 'text-(--color-text)' : 'text-(--color-text-muted) hover:text-(--color-text)'}`} title={confirmDelete ? 'Click again to confirm' : 'Delete'}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                    </button>
                </div>
            )}
        </div>
    )
}

export default function ProblemsPage() {
    const { selectedPipelineId: workspacePipelineId, hydrated } = useWorkspace()
    const [pipelineId, setPipelineId] = useState<string | null>(null)
    const [problems, setProblems] = useState<Problem[]>([])
    const [loading, setLoading] = useState(false)
    const [adding, setAdding] = useState(false)
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [sourcePostId, setSourcePostId] = useState('')

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

    useEffect(() => {
        if (hydrated && workspacePipelineId && workspacePipelineId !== pipelineId) setPipelineId(workspacePipelineId)
    }, [hydrated, pipelineId, workspacePipelineId])

    const loadProblems = useCallback(async (id: string) => {
        setLoading(true)
        const json = await fetchJson<{ data: Problem[] }>(`/api/problems?pipeline_id=${id}`)
        setProblems(json?.data ?? [])
        setLoading(false)
    }, [])

    useEffect(() => {
        if (!pipelineId || !hydrated) return
        const run = async () => { await loadProblems(pipelineId) }
        void run()
    }, [pipelineId, loadProblems, hydrated])

    useEffect(() => {
        if (!pipelineId) return
        const anyPending = problems.some(p => p.embeddingReady === false && Date.now() - new Date(p.createdAt).getTime() < 120000)
        if (!anyPending) return
        const t = setTimeout(() => { void loadProblems(pipelineId) }, 4000)
        return () => clearTimeout(t)
    }, [problems, pipelineId, loadProblems])

    async function handleAdd() {
        if (!title.trim() || !pipelineId) return
        setAdding(true)
        const data = await fetchJson<{ data: Problem }>('/api/problems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pipeline_id: pipelineId,
                title: title.trim(),
                description: description.trim() || null,
                source_post_id: sourcePostId.trim() || null,
            }),
        })
        if (data?.data) {
            setProblems(prev => [...prev, data.data])
            setTitle('')
            setDescription('')
            setSourcePostId('')
        }
        setAdding(false)
    }

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        if (!over || active.id === over.id) return
        const oldIndex = problems.findIndex(p => p.id === active.id)
        const newIndex = problems.findIndex(p => p.id === over.id)
        const prev = problems
        setProblems(arrayMove(problems, oldIndex, newIndex))
        try {
            const res = await fetch(`/api/problems/${active.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ position: newIndex }),
            })
            if (!res.ok) throw new Error('reorder failed')
        } catch {
            setProblems(prev)  // revert the optimistic reorder
            toast.error('Could not reorder problems. Please try again.')
        }
    }

    function handleDelete(id: string) { setProblems(prev => prev.filter(p => p.id !== id)) }
    function handleUpdate(id: string, updates: Partial<Problem>) { setProblems(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p)) }

    return (
        <div className="flex h-[calc(100vh-4rem)] min-h-0 w-full flex-col gap-4 overflow-y-auto px-6 py-6">
            {!pipelineId && (
                <div className="border border-(--color-border) rounded-md p-8 text-center">
                    <p className="text-sm text-(--color-text-muted)">Select a project from the top bar to build its problem breakdown.</p>
                </div>
            )}

            {pipelineId && (
                <>
                    <ProjectTimelineBar pipelineId={pipelineId} />
                    <div className="border border-(--color-border) rounded-md p-4 flex flex-col gap-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">Add Problem</p>
                        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Problem title (required)"
                               className="text-sm border border-(--color-border) rounded-md px-3 py-2 bg-(--color-bg) text-(--color-text) focus:outline-none focus:ring-2 focus:ring-(--color-text)" />
                        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={2}
                                  className="text-sm border border-(--color-border) rounded-md px-3 py-2 bg-(--color-bg) text-(--color-text) focus:outline-none focus:ring-2 focus:ring-(--color-text) resize-none" />
                        <input value={sourcePostId} onChange={e => setSourcePostId(e.target.value)} placeholder="Post ID or URL (optional)"
                               className="text-sm border border-(--color-border) rounded-md px-3 py-2 bg-(--color-bg) text-(--color-text) focus:outline-none focus:ring-2 focus:ring-(--color-text)" />
                        <button onClick={handleAdd} disabled={!title.trim() || adding}
                                className="self-start rounded-md bg-(--color-button) px-4 py-2 text-sm text-(--color-on-button) transition-colors hover:bg-(--color-button-hover) disabled:opacity-40">
                            {adding ? 'Adding...' : 'Add Problem'}
                        </button>
                    </div>

                    {loading && <SkeletonCards count={4} className="grid-cols-1" cardClassName="h-24" />}

                    {!loading && problems.length === 0 && (
                        <div className="border border-(--color-border) rounded-md p-8 text-center">
                            <p className="text-sm text-(--color-text-muted)">Problem statements will appear here once you extract them from source posts.</p>
                        </div>
                    )}

                    {!loading && problems.length > 0 && (
                        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                            <SortableContext items={problems.map(p => p.id)} strategy={verticalListSortingStrategy}>
                                <div className="flex flex-col gap-3">
                                    {problems.map(problem => (
                                        <SortableProblemCard
                                            key={problem.id}
                                            problem={problem}
                                            onDelete={handleDelete}
                                            onUpdate={handleUpdate}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                </>
            )}
        </div>
    )
}
