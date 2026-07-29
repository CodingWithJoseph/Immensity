'use client'

import { ArrowRight, Clock3, Database, TrendingUp } from 'lucide-react'
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'
import type {
    SignalResponse,
    SignalResponseMode,
    SignalResponseStatus,
} from '@/lib/types/signals'
import { Skeleton } from './ui'

const CARD = 'min-w-0 rounded-sm border border-(--color-border) bg-(--color-surface)'
const INK = 'var(--color-text)'
const GRID = 'var(--color-border)'
const MUTED = 'var(--color-text-muted)'

function number(value: number | null | undefined, digits = 0): string {
    if (value == null || Number.isNaN(value)) return 'Unavailable'
    return value.toLocaleString(undefined, { maximumFractionDigits: digits })
}

function percent(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) return 'Unavailable'
    const normalized = value > 1 ? value / 100 : value
    return `${Math.round(normalized * 100)}%`
}

function scorePercent(value: number | null | undefined): number | null {
    if (value == null || Number.isNaN(value)) return null
    const normalized = value <= 1 ? value * 100 : value
    return Math.max(0, Math.min(100, normalized))
}

function compactDate(value: string | null | undefined): string {
    if (!value) return 'Not published'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Not published'
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function slope(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) return 'No data'
    const sign = value > 0 ? '+' : ''
    return `${sign}${Math.round(value * 100)}%`
}

const STATUS_LABEL: Record<SignalResponseStatus, string> = {
    pending: 'Pending',
    processing: 'Processing',
    ready: 'Ready',
    stale: 'Stale',
    failed: 'Failed',
}

const MODE_LABEL: Record<SignalResponseMode, string> = {
    active: 'Active signal',
    forming: 'Forming',
    dormant: 'Dormant',
}

function ScoreGauge({ score, status }: { score: number | null; status: SignalResponseStatus }) {
    const value = scorePercent(score)
    const fill = value == null ? 0 : value
    return (
        <div className={`${CARD} flex h-full min-h-64 flex-col justify-between p-5`}>
            <div className='flex items-center justify-between gap-3'>
                <div>
                    <p className='text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted)'>Signal score</p>
                    <p className='mt-1 text-xs text-(--color-text-muted)'>{STATUS_LABEL[status]}</p>
                </div>
                <TrendingUp size={18} className='text-(--color-text-muted)' aria-hidden />
            </div>
            <div className='flex items-center justify-center py-4'>
                <div
                    className='grid h-40 w-40 place-items-center rounded-full'
                    style={{ background: `conic-gradient(${INK} ${fill * 3.6}deg, ${GRID} 0deg)` }}
                    aria-label={`Signal score ${value == null ? 'unavailable' : Math.round(value)}`}
                >
                    <div className='grid h-32 w-32 place-items-center rounded-full bg-(--color-surface)'>
                        <div className='text-center'>
                            <p className='text-4xl font-semibold tabular-nums text-(--color-text)'>{value == null ? '-' : Math.round(value)}</p>
                            <p className='text-[11px] font-medium uppercase tracking-widest text-(--color-text-muted)'>out of 100</p>
                        </div>
                    </div>
                </div>
            </div>
            <p className='text-xs leading-relaxed text-(--color-text-muted)'>
                {value == null ? 'Score publishes once the signal is generated.' : value >= 70 ? 'Strong enough to inspect now.' : 'Use the evidence before committing.'}
            </p>
        </div>
    )
}

function ScoreGaugeSkeleton() {
    return (
        <div className={`${CARD} flex min-h-64 flex-col justify-between p-5`} aria-busy='true'>
            <div className='flex items-center justify-between gap-3'>
                <div className='flex flex-col gap-2'>
                    <Skeleton className='h-3 w-24' />
                    <Skeleton className='h-3 w-16' />
                </div>
                <Skeleton className='h-5 w-5 rounded-full' />
            </div>
            <div className='flex items-center justify-center py-4'>
                <Skeleton className='h-40 w-40 rounded-full' />
            </div>
            <Skeleton className='h-3 w-2/3' />
        </div>
    )
}

function MetricTile({ label, value, caption }: { label: string; value: string; caption: string }) {
    return (
        <div className={`${CARD} min-h-28 p-4`}>
            <p className='text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted)'>{label}</p>
            <p className='mt-3 text-2xl font-semibold tabular-nums text-(--color-text)'>{value}</p>
            <p className='mt-2 text-xs text-(--color-text-muted)'>{caption}</p>
        </div>
    )
}

function MetricTileSkeleton() {
    return (
        <div className={`${CARD} min-h-28 p-4`} aria-busy='true'>
            <Skeleton className='h-3 w-16' />
            <Skeleton className='mt-3 h-6 w-12' />
            <Skeleton className='mt-3 h-3 w-20' />
        </div>
    )
}

function SlopePill({ label, value }: { label: string; value: number | null }) {
    return (
        <span className='rounded-full bg-(--color-bg) px-2.5 py-1 text-[11px] font-semibold tabular-nums text-(--color-text-muted)'>
            {label} {slope(value)}
        </span>
    )
}

function MomentumPanel({ signal }: { signal: SignalResponse }) {
    const weeks = signal.postVolumeByWeek ?? []
    const hasChart = weeks.length > 0
    const chartData = weeks.map(row => ({ ...row, label: row.week.replace(/^20\d{2}-/, '') }))
    return (
        <section className={`${CARD} h-full p-5`}>
            <div className='mb-4 flex items-start justify-between gap-3'>
                <div>
                    <p className='text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted)'>Momentum</p>
                    <h2 className='mt-1 text-base font-semibold text-(--color-text)'>Volume over time</h2>
                </div>
                <div className='flex flex-wrap justify-end gap-1.5'>
                    <SlopePill label='7d' value={signal.momentum7d} />
                    <SlopePill label='30d' value={signal.momentum30d} />
                    <SlopePill label='90d' value={signal.momentum90d} />
                </div>
            </div>
            {hasChart ? (
                <ResponsiveContainer width='100%' height={230}>
                    <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 6, bottom: 0 }}>
                        <defs>
                            <linearGradient id='signalVolumeFill' x1='0' y1='0' x2='0' y2='1'>
                                <stop offset='0%' stopColor={INK} stopOpacity={0.2} />
                                <stop offset='100%' stopColor={INK} stopOpacity={0.02} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid stroke={GRID} vertical={false} />
                        <XAxis dataKey='label' tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} width={28} />
                        <Tooltip />
                        <Area type='monotone' dataKey='count' stroke={INK} strokeWidth={2} fill='url(#signalVolumeFill)' />
                    </AreaChart>
                </ResponsiveContainer>
            ) : (
                <Unavailable title='No weekly data yet' detail='Weekly post volume has not been published for this signal yet.' />
            )}
        </section>
    )
}

function SourcePanel({ communities }: { communities: string[] }) {
    return (
        <section className={`${CARD} p-5`}>
            <p className='text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted)'>Source mix</p>
            <h2 className='mt-1 text-base font-semibold text-(--color-text)'>{communities.length} {communities.length === 1 ? 'community' : 'communities'}</h2>
            <div className='mt-5 flex flex-wrap gap-2'>
                {communities.map((community, index) => (
                    <span
                        key={`${community}-${index}`}
                        className='inline-flex items-center rounded-full bg-(--color-bg) px-3 py-1.5 text-xs font-medium text-(--color-text)'
                    >
                        {community}
                    </span>
                ))}
            </div>
        </section>
    )
}

function ProblemStatementsPanel({ statements, onViewEvidence }: {
    statements: string[]
    onViewEvidence: () => void
}) {
    return (
        <section className={`${CARD} h-full p-5`}>
            <div className='mb-4 flex items-center justify-between gap-3'>
                <div>
                    <p className='text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted)'>Evidence</p>
                    <h2 className='mt-1 text-base font-semibold text-(--color-text)'>Top problem statements</h2>
                </div>
                <button
                    type='button'
                    onClick={onViewEvidence}
                    aria-label='View posts'
                    title='View posts'
                    className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-(--color-border) bg-(--color-bg) text-(--color-text-muted) transition-colors hover:bg-(--color-border) hover:text-(--color-text)'
                >
                    <ArrowRight size={17} aria-hidden />
                </button>
            </div>
            {statements.length > 0 ? (
                <div className='grid grid-cols-1 gap-3 lg:grid-cols-2'>
                    {statements.map((statement, index) => (
                        <div key={index} className='min-w-0 rounded-sm bg-(--color-bg) p-4'>
                            <span className='text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted)'>#{index + 1}</span>
                            <p className='mt-3 text-sm font-medium leading-relaxed text-(--color-text)'>{statement}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <Unavailable title='No problem statements yet' detail='Representative problem statements have not been published for this signal yet.' />
            )}
        </section>
    )
}

function QualityPanel({ completeness, status }: { completeness: number; status: SignalResponseStatus }) {
    const pct = Math.round(Math.max(0, Math.min(1, completeness)) * 100)
    return (
        <section className={`${CARD} h-full p-5`}>
            <div className='flex items-start justify-between gap-3'>
                <div>
                    <p className='text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted)'>Data quality</p>
                    <h2 className='mt-1 text-base font-semibold text-(--color-text)'>{pct}% complete</h2>
                </div>
                <Database size={18} className='text-(--color-text-muted)' aria-hidden />
            </div>
            <div className='mt-5 h-2 w-full overflow-hidden rounded-full bg-(--color-bg)'>
                <span className='block h-full rounded-full bg-(--color-text)' style={{ width: `${pct}%` }} aria-hidden />
            </div>
            <p className='mt-3 text-xs text-(--color-text-muted)'>
                Status: {STATUS_LABEL[status]}. Completeness is the share of core signal fields that have published values.
            </p>
        </section>
    )
}

function Unavailable({ title, detail }: { title: string; detail: string }) {
    return (
        <div className='rounded-sm border border-dashed border-(--color-border) bg-(--color-bg) p-6'>
            <p className='text-sm font-semibold text-(--color-text)'>{title}</p>
            <p className='mt-1 text-xs leading-relaxed text-(--color-text-muted)'>{detail}</p>
        </div>
    )
}

function DashboardSkeleton() {
    return (
        <div className='flex min-w-0 flex-col gap-4 overflow-x-hidden'>
            <div className='flex flex-wrap items-center gap-2'>
                <Skeleton className='h-7 w-24 rounded-full' />
                <Skeleton className='h-7 w-28 rounded-full' />
            </div>
            <div className='grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]'>
                <ScoreGaugeSkeleton />
                <div className='grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-3'>
                    {Array.from({ length: 6 }).map((_, index) => <MetricTileSkeleton key={index} />)}
                </div>
            </div>
        </div>
    )
}

export default function SignalOverview({
    signal,
    loading = false,
    onViewEvidence = () => {},
}: {
    signal: SignalResponse | null
    loading?: boolean
    onViewEvidence?: () => void
}) {
    if (loading || !signal) return <DashboardSkeleton />

    const communities = signal.sourceCommunities ?? []
    const statements = (signal.topProblemStatements ?? [])
        .map(item => item.problem_statement)
        .filter((statement): statement is string => Boolean(statement))

    const metrics = [
        { label: 'Posts', value: number(signal.totalPosts), caption: MODE_LABEL[signal.mode] },
        { label: 'Authors', value: number(signal.authorCount), caption: 'Distinct voices' },
        { label: 'Communities', value: number(signal.communityCount), caption: 'Market spread' },
        { label: 'Platforms', value: number(signal.platformCount), caption: 'Channels' },
        { label: 'Avg comments', value: number(signal.avgComments, 1), caption: 'Discussion depth' },
        { label: 'Avg votes', value: number(signal.avgVotes, 1), caption: 'Community pull' },
        { label: 'Recency', value: percent(signal.recency), caption: 'Freshness' },
    ]

    return (
        <div className='flex min-w-0 flex-col gap-4 overflow-x-hidden'>
            <div className='flex flex-wrap items-center gap-2'>
                <span className='inline-flex items-center gap-1.5 rounded-full bg-(--color-surface) px-3 py-1.5 text-xs font-semibold text-(--color-text)'>
                    <Clock3 size={13} aria-hidden />
                    {STATUS_LABEL[signal.status]}
                </span>
                <span className='rounded-full bg-(--color-surface) px-3 py-1.5 text-xs font-medium text-(--color-text-muted)'>
                    {MODE_LABEL[signal.mode]}
                </span>
                <span className='rounded-full bg-(--color-surface) px-3 py-1.5 text-xs font-medium text-(--color-text-muted)'>
                    Updated {compactDate(signal.generatedAt)}
                </span>
            </div>

            <div className='grid min-w-0 grid-cols-7 gap-3'>
                {metrics.map(metric => <MetricTile key={metric.label} {...metric} />)}
            </div>

            <div className='grid min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2'>
                <ScoreGauge score={signal.signalScore} status={signal.status} />
                <MomentumPanel signal={signal} />
            </div>

            {communities.length > 0 && <SourcePanel communities={communities} />}

            <div className='grid min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2'>
                <ProblemStatementsPanel statements={statements} onViewEvidence={onViewEvidence} />
                <QualityPanel completeness={signal.completeness} status={signal.status} />
            </div>
        </div>
    )
}
