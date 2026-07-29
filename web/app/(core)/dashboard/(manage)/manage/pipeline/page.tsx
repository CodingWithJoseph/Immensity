'use client'
import { useState, useEffect, useRef } from 'react'
import { DndContext, DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import { PipelineCard, PipelineStage } from '@/lib/types/cluster'
import { STAGES } from '@/app/(core)/dashboard/(manage)/manage/pipeline/constants'
import EmptyBoard from '@/app/(core)/dashboard/(manage)/manage/pipeline/EmptyBoard'
import EmptyColumn from '@/app/(core)/dashboard/(manage)/manage/pipeline/EmptyColumn'
import DraggableCard from '@/app/(core)/dashboard/components/DraggableCard'
import DroppableColumn from '@/app/(core)/dashboard/components/DroppableColumn'
import PipelineCardPanel from '@/app/(core)/dashboard/(manage)/manage/pipeline/PipelineCardPanel'
import { fetchJson } from '@/lib/fetchJson'
import { SkeletonCards } from '@/components/Skeleton'
import { lifecycleStage, type PipelineLifecycleStage } from '@/lib/pipelineLifecycle'
import PipelineCardItem from '@/app/(core)/dashboard/(manage)/manage/pipeline/PipelineCardItem'

export default function PipelinePage() {
    const [cards, setCards] = useState<PipelineCard[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedCard, setSelectedCard] = useState<PipelineCard | null>(null)
    const [launchRequested, setLaunchRequested] = useState(false)
    // Transient banner when a stage move fails to save (and gets rolled back).
    const [saveError, setSaveError] = useState<string | null>(null)
    // Cards with an in-flight stage save — a second drag of the same card is
    // ignored until the first resolves, so we never race two PATCHes.
    const savingIds = useRef<Set<string>>(new Set())

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        // Keyboard drag: focus a card, space to pick up, arrows to move, space to drop.
        useSensor(KeyboardSensor),
    )

    const openCard = (card: PipelineCard, requestLaunch = false) => {
        setSelectedCard(card)
        setLaunchRequested(requestLaunch)
    }

    const closePanel = () => {
        setSelectedCard(null)
        setLaunchRequested(false)
    }

    useEffect(() => {
        async function loadCards() {
            try {
                const [pipelineJson, portfolioJson] = await Promise.all([
                    fetchJson<{ data: PipelineCard[] }>('/api/pipeline'),
                    fetchJson<{ data: PipelineCard[] }>('/api/portfolio'),
                ])
                const all = [...(pipelineJson?.data ?? []), ...(portfolioJson?.data ?? [])]
                setCards([...new Map(all.filter(card => !card.removedAt).map(card => [card.id, card])).values()])
            } catch (err) {
                console.error('Pipeline load error:', err)
                setError('Something went wrong loading your pipeline.')
            } finally {
                setLoading(false)
            }
        }
        void loadCards()
    }, [])

    const handleStageChange = async (id: string, stage: PipelineStage) => {
        if (savingIds.current.has(id)) return
        const previousStage = cards.find(c => c.id === id)?.stage
        if (previousStage === undefined || previousStage === stage) return

        // Optimistic move, then confirm with the server. On failure we put the
        // card back where it was so the board never disagrees with saved state.
        savingIds.current.add(id)
        setSaveError(null)
        setCards(prev => prev.map(c => c.id === id ? { ...c, stage } : c))
        setSelectedCard(prev => prev?.id === id ? { ...prev, stage } : prev)
        try {
            const res = await fetch(`/api/pipeline/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stage }),
            })
            if (!res.ok) throw new Error(`PATCH /api/pipeline/${id} → ${res.status}`)
        } catch (err) {
            console.error('Pipeline stage save failed:', err)
            setCards(prev => prev.map(c => c.id === id ? { ...c, stage: previousStage } : c))
            setSelectedCard(prev => prev?.id === id ? { ...prev, stage: previousStage } : prev)
            setSaveError('Couldn’t save that move — the card is back where it was. Check your connection and try again.')
        } finally {
            savingIds.current.delete(id)
        }
    }

    const handleLaunch = (id: string) => {
        const launchedAt = new Date().toISOString()
        setCards(prev => prev.map(c => c.id === id ? { ...c, launchedAt, status: 'active' } : c))
        setSelectedCard(prev => prev?.id === id ? { ...prev, launchedAt, status: 'active' } : prev)
        setLaunchRequested(false)
    }

    const handleUpdate = (id: string, updates: Partial<PipelineCard>) => {
        setCards(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
        setSelectedCard(prev => prev?.id === id ? { ...prev, ...updates } : prev)
    }

    const handleRemove = (id: string) => {
        setCards(prev => prev.filter(c => c.id !== id))
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        if (!over) return
        const cardId = active.id as string
        const newStage = over.id as PipelineLifecycleStage
        const card = cards.find(c => c.id === cardId)
        if (!card || lifecycleStage(card) === newStage) return
        if (newStage === 'launched') {
            openCard(card, true)
            return
        }
        await handleStageChange(cardId, newStage)
    }

    const visibleCards = cards.filter(c => !c.removedAt)

    return (
        <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto px-6 py-6">
            {loading && <SkeletonCards count={2} className="grid-cols-1 md:grid-cols-2" cardClassName="h-64" />}
            {!loading && error && <p className="text-sm text-(--color-text-muted)">{error}</p>}
            {saveError && (
                <div role="alert" className="flex items-start justify-between gap-3 rounded-md border border-(--color-error) bg-(--color-error-soft) px-3 py-2 text-sm text-(--color-error)">
                    <span>{saveError}</span>
                    <button type="button" onClick={() => setSaveError(null)} aria-label="Dismiss" className="shrink-0 font-semibold hover:opacity-70">Dismiss</button>
                </div>
            )}
            {!loading && !error && visibleCards.length === 0 && <EmptyBoard />}

            {!loading && !error && visibleCards.length > 0 && (
                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                    <div className="grid grid-cols-1 gap-4 items-start md:grid-cols-3">
                        {STAGES.map(stage => {
                            const stageCards = visibleCards.filter(c => lifecycleStage(c) === stage.id)
                            return (
                                <div key={stage.id} className="flex flex-col gap-3">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold text-(--color-text)">{stage.label}</p>
                                            <p className="text-xs text-(--color-text-muted)">{stageCards.length}</p>
                                        </div>
                                    </div>
                                    <DroppableColumn stage={stage.id}>
                                        {stageCards.length === 0 && <EmptyColumn />}
                                        {stageCards.map(card => stage.id === 'launched' ? (
                                            <PipelineCardItem key={card.id} card={card} onClick={() => openCard(card)} />
                                        ) : (
                                            <DraggableCard key={card.id} card={card} onClick={() => openCard(card)} />
                                        ))}
                                    </DroppableColumn>
                                </div>
                            )
                        })}
                    </div>
                </DndContext>
            )}

            {selectedCard && (
                <PipelineCardPanel
                    key={`${selectedCard.id}-${launchRequested ? 'launch' : 'detail'}`}
                    card={selectedCard}
                    onClose={closePanel}
                    onLaunch={handleLaunch}
                    onRemove={handleRemove}
                    onUpdate={handleUpdate}
                    initialLaunchPrompt={launchRequested}
                />
            )}
        </div>
    )
}
