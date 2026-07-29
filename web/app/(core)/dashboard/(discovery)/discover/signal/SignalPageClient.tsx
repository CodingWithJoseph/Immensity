'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { SignalResponse, SignalWorkspace } from '@/lib/types/signals'
import SignalHeader from './SignalHeader'
import SignalOverview from './SignalOverview'
import ScrollArea from '@/app/(core)/dashboard/components/ScrollArea'
import { useWorkspace } from '@/app/(core)/dashboard/contexts/WorkspaceContext'
import ProjectTimelineBar from '@/app/(core)/dashboard/components/ProjectTimelineBar'
import SignalWorkspaceController from './workspace/SignalWorkspaceController'

function headerWorkspace(pipelineId: string): SignalWorkspace {
    return {
        pipeline: {
            id: pipelineId,
            name: 'Signal',
            notes: null,
            sourceClusterId: null,
            stage: 'watching',
        },
        cluster: null,
        metrics: { postCount: 0, avgSourceScore: null, commentCount: 0, averageUpvoteRatio: null },
        analytics: null,
        availability: { clusterAnalytics: false },
    }
}

function SignalLoadError({ status, onRetry, onChooseAnother }: {
    status: number | null
    onRetry: () => void
    onChooseAnother: () => void
}) {
    return (
        <div className='flex h-[calc(100vh-4rem)] min-h-0 bg-(--color-bg) px-5 py-6 md:px-6'>
            <div className='mx-auto w-full max-w-xl rounded-sm border border-(--color-border) bg-(--color-surface) p-6'>
                <p className='text-xl font-semibold text-(--color-text)'>Signal data unavailable</p>
                <p className='mt-2 text-sm leading-relaxed text-(--color-text-muted)'>
                    {status === 404
                        ? 'No signal has been published for this opportunity yet.'
                        : `The signal API could not be reached${status ? ` (returned ${status})` : ''}. Try again in a moment.`}
                </p>
                <div className='mt-5 flex flex-wrap gap-2'>
                    <button
                        type='button'
                        onClick={onRetry}
                        className='rounded-sm bg-(--color-button) px-3 py-2 text-xs font-semibold text-(--color-on-button) transition-colors hover:bg-(--color-button-hover)'
                    >
                        Retry
                    </button>
                    <button
                        type='button'
                        onClick={onChooseAnother}
                        className='rounded-sm border border-(--color-border) px-3 py-2 text-xs font-semibold text-(--color-text-muted) transition-colors hover:bg-(--color-border) hover:text-(--color-text)'
                    >
                        Choose another
                    </button>
                </div>
            </div>
        </div>
    )
}

function SignalInner() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const queryPipelineId = searchParams.get('pipelineId')
    const { selectedPipelineId, hydrated } = useWorkspace()
    const pipelineId = queryPipelineId ?? (hydrated ? selectedPipelineId : null)
    const [loadState, setLoadState] = useState<{
        pipelineId: string
        signal: SignalResponse | null
        failed: boolean
        status: number | null
    } | null>(null)
    const [reloadToken, setReloadToken] = useState(0)

    useEffect(() => {
        if (!pipelineId) return
        const ctrl = new AbortController()
        void (async () => {
            try {
                const res = await fetch(`/api/pipeline/${pipelineId}/signal`, { signal: ctrl.signal })
                if (!res.ok) {
                    setLoadState({ pipelineId, signal: null, failed: true, status: res.status })
                    return
                }
                setLoadState({
                    pipelineId,
                    signal: (await res.json()) as SignalResponse,
                    failed: false,
                    status: null,
                })
            } catch (error) {
                if ((error as Error).name !== 'AbortError') {
                    setLoadState({ pipelineId, signal: null, failed: true, status: null })
                }
            }
        })()
        return () => ctrl.abort()
    }, [pipelineId, reloadToken])

    if (!pipelineId) {
        return (
            <div className='grid h-[calc(100vh-4rem)] min-h-0 place-items-center bg-(--color-bg) px-5 py-6 md:px-6'>
                <section className='w-full rounded-md bg-(--color-surface) p-5 text-center text-sm text-(--color-text-muted)'>
                    Select a project from the top bar to inspect its signal.
                </section>
            </div>
        )
    }

    const current = loadState?.pipelineId === pipelineId ? loadState : null
    if (current?.failed) {
        return (
            <SignalLoadError
                status={current.status}
                onRetry={() => {
                    setLoadState(null)
                    setReloadToken(value => value + 1)
                }}
                onChooseAnother={() => {
                    router.push('/dashboard/pipeline')
                }}
            />
        )
    }

    // No completed result for this pipeline yet -> the fetch is in flight.
    const signal = current?.signal ?? null
    const loading = current == null
    return (
        <div className='flex h-[calc(100vh-4rem)] min-h-0 min-w-0 overflow-hidden bg-(--color-bg)'>
            <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
                <div className='flex shrink-0 items-center gap-4 border-b border-(--color-border) bg-(--color-bg) px-5 py-3 md:px-6'>
                    <div className='min-w-0 flex-1'>
                        <ProjectTimelineBar pipelineId={pipelineId} />
                    </div>
                    <SignalHeader workspace={headerWorkspace(pipelineId)} />
                </div>
                <ScrollArea
                    className='flex-1 bg-(--color-bg)'
                    contentClassName='px-5 py-5 md:px-6'
                    ariaLabel='Show more signal content'
                >
                    <SignalOverview
                        signal={signal}
                        loading={loading}
                        onViewEvidence={() => router.push(`/dashboard/discover/posts?pipelineId=${pipelineId}`)}
                    />
                </ScrollArea>
            </div>
        </div>
    )
}

export function LegacySignalPageClient() {
    return (
        <Suspense fallback={<div className='px-6 py-6 text-sm text-(--color-text-muted)'>Loading...</div>}>
            <SignalInner />
        </Suspense>
    )
}

export default function SignalPageClient() {
    return (
        <Suspense fallback={<div className='px-6 py-6 text-sm text-(--color-text-muted)'>Loading...</div>}>
            <SignalWorkspaceController />
        </Suspense>
    )
}
