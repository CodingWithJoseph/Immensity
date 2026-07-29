'use client'
import Link from 'next/link'
import { routes } from '@/app/util/routes'

export default function TrendingClusterCard({ id, name, postCount, metricLabel, metricValue }: {
    id: number
    name: string | null
    postCount: number | null
    metricLabel: string
    metricValue: string
}) {
    return (
        <Link
            href={`${routes.core.signal}?cluster_id=${id}`}
            className='group block rounded-lg border border-(--color-border) bg-(--color-surface-raised) p-3 shadow-[var(--shadow-sm)] transition-colors hover:border-(--accent-line) hover:bg-(--color-accent-soft)'
        >
            <div className='flex items-center justify-between gap-2'>
                <span className='truncate text-sm font-medium text-(--color-text)'>{name ?? `Cluster ${id}`}</span>
                <span className='shrink-0 rounded-full bg-(--color-bg) px-2 py-0.5 text-xs font-semibold text-(--color-text) group-hover:bg-(--color-surface-raised)'>{metricValue}</span>
            </div>
            <div className='mt-2 flex items-center gap-2 text-[10px] uppercase tracking-wide text-(--color-text-muted)'>
                <span>{metricLabel}</span>
                {postCount != null && <><span className='text-(--color-accent)'>|</span><span>{postCount} posts</span></>}
            </div>
        </Link>
    )
}
