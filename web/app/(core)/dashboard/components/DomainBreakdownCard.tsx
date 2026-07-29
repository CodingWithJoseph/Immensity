'use client'
import { DomainBreakdownEntry } from '@/lib/types/dashboard'
import FeatureContextDot from '@/app/(core)/dashboard/components/FeatureContextDot'

export default function DomainBreakdownCard({ domains }: { domains: DomainBreakdownEntry[] }) {
    // Loaded with nothing to show: hide the card entirely.
    if (!domains.length) return null

    const top = domains.slice(0, 5)
    const maxPosts = Math.max(1, ...top.map(d => d.postCount))

    return (
        <section className='flex h-full min-h-0 flex-col gap-2'>
            <div className='flex items-center gap-2'>
                <FeatureContextDot category='manage' />
                <h3 className='text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)'>Domain breakdown</h3>
            </div>
            <div className='flex min-h-0 flex-1 flex-col rounded-lg border border-(--color-border) bg-(--color-surface-raised) p-5 shadow-(--shadow-sm)'>
                <div className='flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1'>
                    {top.map(d => (
                        <div key={d.domain} className='flex flex-col gap-1.5 rounded-lg bg-(--color-surface-raised) p-3'>
                            <div className='flex items-center justify-between gap-3'>
                                <span className='truncate text-sm text-(--color-text)'>{d.domain}</span>
                                <div className='flex shrink-0 items-center gap-3 text-xs text-(--color-text-muted)'>
                                    <span>{d.postCount} posts</span>
                                    <span className='font-semibold text-(--color-text)'>{d.clusterCount} clusters</span>
                                </div>
                            </div>
                            <div className='h-1 overflow-hidden rounded-full bg-(--color-surface-tint)' aria-hidden>
                                <div className='h-full rounded-full bg-(--color-text)' style={{ width: `${Math.max(8, (d.postCount / maxPosts) * 100)}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
