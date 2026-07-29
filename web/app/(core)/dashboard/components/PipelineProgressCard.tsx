'use client'
import Link from 'next/link'
import { PipelineCard } from '@/lib/types/cluster'
import { routes } from '@/app/util/routes'
import { timelineProgress, phaseBarClass } from '@/lib/timeline'
import ProgressBar from '@/app/(core)/dashboard/components/ProgressBar'

const stageLabels: Record<string, string> = {
    watching: 'Watching',
    discovery: 'Discovery',
    exploring: 'Exploring',
    validating: 'Validating',
    building: 'Building',
}

export default function PipelineProgressCard({ card }: { card: PipelineCard }) {
    const timeline = card.timelineDays && card.timelineStart
        ? timelineProgress(card.timelineStart, card.timelineDays, card.launchedAt ?? null)
        : null

    return (
        <Link
            href={`${routes.core.signal}?pipelineId=${card.id}`}
            className='block overflow-hidden rounded-md border border-(--color-border) bg-(--color-surface-raised) shadow-[var(--shadow-sm)] transition-colors hover:border-(--accent-line) hover:bg-(--color-accent-soft)'
        >
            <div className='p-3'>
                <div className='flex items-center justify-between gap-2'>
                    <span className='text-sm font-medium text-(--color-text) truncate'>{card.displayName ?? card.name}</span>
                    <span className='text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-(--status-progress-bg) text-(--status-progress-text) shrink-0'>
                        {stageLabels[card.stage] ?? card.stage}
                    </span>
                </div>
                <div className='flex items-center gap-3 mt-2 text-xs text-(--color-text-muted)'>
                    <span>{card.postIds.length} posts</span>
                </div>
            </div>
            {timeline && (
                <ProgressBar
                    value={timeline.percent}
                    max={100}
                    size='sm'
                    className='w-full rounded-none'
                    fillClassName={phaseBarClass(timeline.phase)}
                />
            )}
        </Link>
    )
}
