'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useWorkspace } from '@/app/(core)/dashboard/contexts/WorkspaceContext'
import PostsBrowser from './PostsBrowser'

function PostsInner() {
    const searchParams = useSearchParams()
    const queryPipelineId = searchParams.get('pipelineId') ?? searchParams.get('clusterId')
    const { selectedPipelineId, hydrated } = useWorkspace()
    const [localPipelineId, setLocalPipelineId] = useState<string | null>(queryPipelineId)
    const pipelineId = queryPipelineId ?? localPipelineId

    useEffect(() => {
        if (hydrated && !queryPipelineId && !localPipelineId && selectedPipelineId) {
            setLocalPipelineId(selectedPipelineId)
        }
    }, [hydrated, localPipelineId, queryPipelineId, selectedPipelineId])

    return (
        <div className='flex h-[calc(100vh-4rem)] min-h-0 min-w-0 flex-col overflow-hidden bg-(--color-bg) px-5 py-6 md:px-6'>
            {pipelineId ? (
                <PostsBrowser pipelineId={pipelineId} />
            ) : (
                <section className='rounded-md bg-(--color-surface) p-5 text-sm text-(--color-text-muted)'>
                    Select a project from the top bar to review source posts and comments.
                </section>
            )}
        </div>
    )
}

export default function PostsPage() {
    return (
        <Suspense fallback={<div className='px-8 py-8 text-sm text-(--color-text-muted)'>Loading...</div>}>
            <PostsInner />
        </Suspense>
    )
}
