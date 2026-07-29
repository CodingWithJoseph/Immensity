'use client'
import type { ReactNode } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowRight, Info } from 'lucide-react'
import type { SignalAnalytics } from '@/lib/types/signals'

const INK = 'var(--color-text)'
const GRID = 'var(--color-border)'
const AXIS = 'var(--color-text-muted)'
const OVERVIEW_CARD = 'rounded-sm bg-(--color-surface) p-6'

function ChartCard({
    title,
    hint,
    children,
    className = '',
    action,
}: {
    title: string
    hint: string
    children: ReactNode
    className?: string
    action?: ReactNode
}) {
    return (
        <section className={`${OVERVIEW_CARD} flex min-w-0 flex-col overflow-hidden ${className}`}>
            <div className='mb-4 flex items-start justify-between gap-4'>
                <div>
                    <h2 className='text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)'>{title}</h2>
                    <p className='text-xs text-(--color-text-muted) mt-1.5 leading-relaxed'>{hint}</p>
                </div>
                {action}
            </div>
            {children}
        </section>
    )
}

export function StatCard({
    title,
    label,
    description,
    value,
    help,
}: {
    title: string
    label: string
    description: string
    value: ReactNode
    help: string
}) {
    return (
        <div className='relative flex min-h-36 min-w-0 flex-col rounded-sm bg-(--color-surface) p-4'>
            <div className='flex items-start justify-between gap-3'>
                <div className='flex min-w-0 items-center gap-1.5'>
                    <span className='text-sm font-semibold text-(--color-text)'>{title}</span>
                    <div className='group relative inline-flex shrink-0'>
                        <button
                            type='button'
                            aria-label={`About ${title}`}
                            className='inline-flex h-5 w-5 items-center justify-center rounded-full text-(--color-text-muted) transition-colors hover:bg-(--color-border) hover:text-(--color-text) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-text)'
                        >
                            <Info size={14} aria-hidden />
                        </button>
                        <div
                            role='tooltip'
                            className='pointer-events-none absolute left-0 top-full z-50 mt-2 w-64 rounded-lg bg-(--color-text) px-3 py-2 text-xs leading-relaxed text-(--color-bg) opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100'
                        >
                            {help}
                        </div>
                    </div>
                </div>
                <span className='shrink-0 text-right text-xl font-semibold tabular-nums text-(--color-text)'>{value}</span>
            </div>
            <span className='mt-2 self-start rounded-full bg-(--color-bg) px-2.5 py-1 text-[11px] font-medium leading-tight text-(--color-text-muted)'>{label}</span>
            <span className='mt-auto pt-5 text-xs leading-relaxed text-(--color-text-muted)'>{description}</span>
        </div>
    )
}

export function VolumeSection({ data, className = '' }: { data: SignalAnalytics['postVolumeByDate']; className?: string }) {
    if (data.length < 2) return null

    const chartData = data.map(item => ({
        ...item,
        label: new Date(`${item.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }))
    return (
        <ChartCard title='Cluster Size Over Time' hint='How post volume has changed across pipeline snapshots.' className={className}>
            <ResponsiveContainer className='min-w-0' width='100%' height={330}>
                <LineChart data={chartData} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                    <CartesianGrid vertical={false} stroke={GRID} />
                    <XAxis dataKey='label' tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip />
                    <Line type='monotone' dataKey='count' name='Posts' stroke={INK} strokeWidth={2} dot={{ r: 3, fill: INK }} />
                </LineChart>
            </ResponsiveContainer>
        </ChartCard>
    )
}

export function SourceBreakdownSection({
    data,
    className = '',
    onViewEvidence,
}: {
    data: SignalAnalytics['sourceBreakdown']
    className?: string
    onViewEvidence?: () => void
}) {
    const total = data.reduce((sum, source) => sum + source.count, 0) || 1
    const sortedSources = [...data].sort((a, b) => b.count - a.count)
    const visibleSources = sortedSources.slice(0, 4)
    const remainingCount = Math.max(0, sortedSources.length - visibleSources.length)
    const maxCount = visibleSources[0]?.count ?? 1

    return (
        <ChartCard
            title='Source Breakdown'
            hint='Where this signal is appearing across communities or platforms.'
            className={className}
            action={onViewEvidence && (
                <button
                    type='button'
                    onClick={onViewEvidence}
                    aria-label='View source posts'
                    title='View source posts'
                    className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-(--color-border) bg-(--color-bg) text-(--color-text-muted) transition-colors hover:bg-(--color-border) hover:text-(--color-text)'
                >
                    <ArrowRight size={17} aria-hidden />
                </button>
            )}
        >
            {data.length > 0 ? (
                <>
                    <ul className={`flex flex-col ${visibleSources.length <= 2 ? 'gap-3' : 'gap-2.5'}`}>
                        {visibleSources.map((source, index) => {
                            const label = source.site || source.platform || 'Unknown'
                            const percent = Math.round((source.count / total) * 100)
                            const barWidth = Math.max(4, Math.round((source.count / maxCount) * 100))
                            return (
                                <li key={`${label}-${index}`} className='relative overflow-hidden rounded-sm bg-(--color-bg) px-3 py-2.5'>
                                    <span
                                        aria-hidden
                                        className='absolute inset-y-0 left-0 rounded-sm opacity-20'
                                        style={{ width: `${barWidth}%`, backgroundColor: INK }}
                                    />
                                    <div className='relative flex items-center gap-3'>
                                        <span className='min-w-0 flex-1 truncate text-sm text-(--color-text)'>{label}</span>
                                        <span className='text-sm font-semibold text-(--color-text) tabular-nums'>{source.count}</span>
                                        <span className='w-10 text-right text-xs text-(--color-text-muted) tabular-nums'>{percent}%</span>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                    {remainingCount > 0 && (
                        <p className='mt-auto pt-4 text-xs text-(--color-text-muted)'>+ {remainingCount} more source{remainingCount === 1 ? '' : 's'}</p>
                    )}
                </>
            ) : <p className='text-sm text-(--color-text-muted)'>No source breakdown is available yet.</p>}
        </ChartCard>
    )
}
