'use client'
import Link from 'next/link'
import { routes } from '@/app/util/routes'
import { DashboardMovers, MomentumMover } from '@/lib/types/dashboard'
import DashboardEmptyState from '@/app/(core)/dashboard/components/DashboardEmptyState'
import FeatureContextDot from '@/app/(core)/dashboard/components/FeatureContextDot'

// "What needs my attention" — top risers and fallers by 30-day momentum, from
// GET /dashboard/movers (cluster_signals.momentum_30d).

function fmtMomentum(v: number | null): string {
    if (v == null) return '—'
    const pct = Math.round(v * 100)
    return `${pct > 0 ? '+' : ''}${pct}%`
}

function MoverRow({ mover, direction }: { mover: MomentumMover; direction: 'up' | 'down' }) {
    const color = direction === 'up' ? 'text-(--color-blue)' : 'text-(--color-error)'
    const arrow = direction === 'up' ? '▲' : '▼'
    return (
        <Link
            href={`${routes.core.signal}?cluster_id=${mover.id}`}
            className='group flex items-center justify-between gap-3 rounded-md border border-(--color-border) bg-(--color-surface-raised) px-3 py-2 shadow-[var(--shadow-sm)] transition-colors hover:border-(--color-blue) hover:bg-(--color-blue-soft)'
        >
            <div className='min-w-0 flex flex-col'>
                <span className='truncate text-sm font-medium text-(--color-text)'>{mover.name ?? `Cluster ${mover.id}`}</span>
                <span className='text-[10px] uppercase tracking-wide text-(--color-text-muted)'>{mover.postCount} posts</span>
            </div>
            <span className={`shrink-0 text-sm font-semibold ${color}`}>
                {arrow} {fmtMomentum(mover.momentum30d)}
            </span>
        </Link>
    )
}

export default function MomentumMoversCard({ movers, loading }: { movers: DashboardMovers | null; loading: boolean }) {
    if (loading) {
        return (
            <section className='flex h-full min-h-0 flex-col gap-2'>
                <div className='flex items-center justify-between gap-2 pr-3'>
                    <div className='flex items-center gap-2'>
                        <FeatureContextDot category='market' />
                        <h2 className='text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)'>Momentum movers</h2>
                    </div>
                    <span className='text-[10px] uppercase tracking-wide text-(--color-text-faint)'>30-day</span>
                </div>
                <div className='min-h-0 flex-1 animate-pulse rounded-md border border-(--color-border) bg-(--color-surface-tint)' />
            </section>
        )
    }

    const risers = movers?.risers ?? []
    const fallers = movers?.fallers ?? []
    const visibleRisers = risers.slice(0, 3)
    const visibleFallers = fallers.slice(0, Math.max(0, 3 - visibleRisers.length))
    const empty = risers.length === 0 && fallers.length === 0

    return (
        <section className='flex h-full min-h-0 flex-col gap-2'>
            <div className='flex items-center justify-between gap-2 pr-3'>
                <div className='flex items-center gap-2'>
                    <FeatureContextDot category='market' />
                    <h2 className='text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)'>Momentum movers</h2>
                </div>
                <span className='text-[10px] uppercase tracking-wide text-(--color-text-faint)'>30-day</span>
            </div>

            {empty ? (
                <DashboardEmptyState>
                    {movers && !movers.available ? 'Momentum data is not available yet.' : 'No momentum movement to report yet.'}
                </DashboardEmptyState>
            ) : (
                <div className='flex min-h-0 flex-1 flex-col rounded-md border border-(--color-border) bg-(--color-surface-raised) p-4 shadow-[var(--shadow-sm)]'>
                    <div className='flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1'>
                        {visibleRisers.length > 0 && (
                            <section className='flex flex-col gap-2'>
                                <p className='text-[10px] font-semibold uppercase tracking-widest text-(--color-blue)'>Rising</p>
                                {visibleRisers.map(m => <MoverRow key={`up-${m.id}`} mover={m} direction='up' />)}
                            </section>
                        )}

                        {visibleFallers.length > 0 && (
                            <section className='flex flex-col gap-2'>
                                <p className='text-[10px] font-semibold uppercase tracking-widest text-(--color-error)'>Cooling</p>
                                {visibleFallers.map(m => <MoverRow key={`down-${m.id}`} mover={m} direction='down' />)}
                            </section>
                        )}
                    </div>
                </div>
            )}
        </section>
    )
}
