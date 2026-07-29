'use client'
import { useDroppable } from '@dnd-kit/core'
import type { PipelineLifecycleStage } from '@/lib/pipelineLifecycle'
import React from "react";

interface Props {
    stage: PipelineLifecycleStage
    children: React.ReactNode
}

export default function DroppableColumn({ stage, children }: Props) {
    const { setNodeRef, isOver } = useDroppable({ id: stage })

    return (
        <div
            ref={setNodeRef}
            className={`flex min-h-32 flex-col gap-3 rounded-md transition-colors ${
                isOver ? 'bg-(--color-border)/40' : ''
            }`}>
            {children}
        </div>
    )
}
