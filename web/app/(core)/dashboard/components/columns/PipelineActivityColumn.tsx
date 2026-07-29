'use client'
import { PipelineCard } from '@/lib/types/cluster'
import PipelineProgressCard from '@/app/(core)/dashboard/components/PipelineProgressCard'
import DashboardEmptyState from '@/app/(core)/dashboard/components/DashboardEmptyState'
import FeatureContextDot from '@/app/(core)/dashboard/components/FeatureContextDot'

function activeCards(cards: PipelineCard[] | null | undefined) {
    return (cards ?? []).filter(c => !c.launchedAt && !c.removedAt)
}

export function PipelineSummaryCard({ cards }: { cards: PipelineCard[] | null }) {
    const active = activeCards(cards)

    return (
        <section className='flex h-full min-h-0 flex-col gap-2'>
            <div className='flex items-center gap-2'>
                <FeatureContextDot category='build' />
                <h2 className='text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)'>Pipeline</h2>
            </div>
            <div className='flex min-h-0 flex-1 flex-col justify-between rounded-md border border-(--color-border) bg-(--color-surface-raised) p-4 shadow-[var(--shadow-sm)]'>
                <div className='h-1 w-10 rounded-full bg-(--color-accent)' />
                <div>
                    <p className='text-3xl font-semibold tracking-[-0.03em] text-(--color-text)'>{cards == null ? '-' : active.length}</p>
                    <p className='text-xs text-(--color-text-muted)'>In pipeline</p>
                </div>
            </div>
        </section>
    )
}

export function PipelineProgressListCard({ cards }: { cards: PipelineCard[] | null }) {
    const active = activeCards(cards)
    const visible = active.slice(0, 3)

    return (
        <section className='flex h-full min-h-0 flex-col gap-2'>
            <div className='flex items-center gap-2'>
                <FeatureContextDot category='build' />
                <h2 className='text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)'>Progress</h2>
            </div>
            {cards != null && active.length === 0 ? (
                <DashboardEmptyState>No active clusters in your pipeline yet.</DashboardEmptyState>
            ) : (
                <div className='flex min-h-0 flex-1 flex-col rounded-md border border-(--color-border) bg-(--color-surface-raised) p-4 shadow-[var(--shadow-sm)]'>
                    <div className='flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1'>
                        {visible.map(c => <PipelineProgressCard key={c.id} card={c} />)}
                    </div>
                </div>
            )}
        </section>
    )
}

export default function PipelineActivityColumn({ cards = null }: { cards?: PipelineCard[] | null }) {
    return (
        <div className='flex h-full min-h-0 flex-col gap-4'>
            <PipelineSummaryCard cards={cards} />
            <PipelineProgressListCard cards={cards} />
        </div>
    )
}
