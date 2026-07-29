'use client'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { PipelineCard } from '@/lib/types/cluster'
import PipelineCardItem from '@/app/(core)/dashboard/(manage)/manage/pipeline/PipelineCardItem'

interface Props {
    card: PipelineCard
    onClick: () => void
}

export default function DraggableCard({ card, onClick}: Props) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: card.id,
        data: { card },
    })

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className={isDragging ? 'cursor-grabbing' : 'cursor-grab'}>
            <PipelineCardItem card={card} onClick={onClick}/>
        </div>
    )
}