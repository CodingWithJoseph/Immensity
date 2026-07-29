'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronRight } from 'lucide-react'
import { fetchJson, ApiData } from '@/lib/fetchJson'
import { routes } from '@/app/util/routes'
import DashboardEmptyState from '@/app/(core)/dashboard/components/DashboardEmptyState'
import { ProgressRow } from '@/app/(core)/dashboard/components/ProgressBar'
import { ScopeBadge } from '@/app/(core)/dashboard/components/ScopeBadge'
import { formatDate } from '@/lib/format'
import type { Goal } from '@/lib/types/goals'
import { goalDisplayName, goalTarget, goalPercent, type GoalScope } from '@/lib/goalsView'


// Cap on visible goal rows; the rest live behind "View goals & milestones".
const GOAL_ROW_LIMIT = 4

export function GoalRow({ goal }: { goal: Goal }) {
    const complete = goal.nextTier == null
    return (
        <ProgressRow
            title={goalDisplayName(goal)}
            current={goal.currentValue}
            target={goalTarget(goal)}
            label={complete ? 'Complete' : `${goalPercent(goal)}%`}
        />
    )
}

// Append-only milestone log across the card's goals: text + checkmark + date,
// most recent first. No badge icons/collectibles.
export function MilestoneLog({ goals }: { goals: Goal[] }) {
    const entries = goals
        .flatMap(goal => (goal.milestones ?? []).map(m => ({ key: `${goal.id}-${m.tierIndex}`, title: goal.title, label: m.label, achievedAt: m.achievedAt })))
        .sort((a, b) => b.achievedAt.localeCompare(a.achievedAt))

    if (entries.length === 0) return null

    return (
        <div className='mt-1 border-t border-(--color-border) pt-2'>
            <p className='mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-(--color-text-faint)'>Milestones</p>
            <ul className='flex flex-col gap-1'>
                {entries.map(entry => (
                    <li key={entry.key} className='flex items-center gap-2 text-xs'>
                        <Check aria-hidden className='h-3.5 w-3.5 shrink-0 text-(--color-success)' />
                        <span className='min-w-0 flex-1 truncate text-(--color-text)'>{entry.title} · {entry.label}</span>
                        <span className='shrink-0 text-(--color-text-muted)'>{formatDate(entry.achievedAt)}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

function GoalsCard({ title, goals, loading, emptyMessage }: { title: string; goals: Goal[]; loading: boolean; emptyMessage: string }) {
    return (
        <section className='flex h-full min-h-0 flex-col gap-2'>
            <h2 className='text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)'>{title}</h2>
            {loading ? (
                <p className='text-sm text-(--color-text-muted)'>Loading goals…</p>
            ) : goals.length === 0 ? (
                <DashboardEmptyState>{emptyMessage}</DashboardEmptyState>
            ) : (
                <div className='flex min-h-0 flex-1 flex-col'>
                    {/* No internal scroll: show a capped set of rows; the rest (and
                        the milestone log) live behind the link below. */}
                    <div className='flex-1'>
                        {goals.slice(0, GOAL_ROW_LIMIT).map(goal => <GoalRow key={goal.id} goal={goal} />)}
                    </div>
                    <Link href={routes.core.goals} className='mt-2 inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-(--color-link) hover:text-(--color-link-hover)'>
                        View goals &amp; milestones<ChevronRight aria-hidden className='h-3.5 w-3.5' />
                    </Link>
                </div>
            )}
        </section>
    )
}

function useGoals(url: string | null): { goals: Goal[]; loading: boolean } {
    const [goals, setGoals] = useState<Goal[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let active = true
        if (!url) {
            // Defer to a microtask so we never call setState synchronously inside
            // the effect body.
            void Promise.resolve().then(() => { if (active) { setGoals([]); setLoading(false) } })
            return () => { active = false }
        }
        void fetchJson<ApiData<Goal[]>>(url)
            .then(json => {
                const data = json?.data
                // Only accept well-formed goal objects so a mis-shaped response
                // can never crash the card.
                if (active) setGoals(Array.isArray(data) ? data.filter(g => g && Array.isArray(g.tiers) && Array.isArray(g.milestones)) : [])
            })
            .catch(() => { if (active) setGoals([]) })
            .finally(() => { if (active) setLoading(false) })
        return () => { active = false }
    }, [url])

    return { goals, loading }
}

function GoalsColumn({ scope, name, goals, loading, emptyMessage }: { scope: GoalScope; name?: string; goals: Goal[]; loading: boolean; emptyMessage: string }) {
    return (
        <div className='flex min-h-0 flex-col gap-1.5'>
            <ScopeBadge scope={scope} name={name} />
            {loading ? (
                <p className='text-xs text-(--color-text-muted)'>Loading…</p>
            ) : goals.length === 0 ? (
                <p className='text-xs text-(--color-text-muted)'>{emptyMessage}</p>
            ) : (
                <div>{goals.slice(0, GOAL_ROW_LIMIT).map(goal => <GoalRow key={goal.id} goal={goal} />)}</div>
            )}
        </div>
    )
}

// Two-column goals content for the Portfolio card: portfolio-wide goals and the
// selected product's goals, each labelled with its scope so it's clear which
// product a goal belongs to. The card's shared title + "View goals & milestones"
// link live outside this (in the Portfolio grid).
export function PortfolioGoalsColumns({ selectedProductId, productName }: { selectedProductId: string | null; productName?: string | null }) {
    const account = useGoals('/api/portfolio/goals')
    const project = useGoals(selectedProductId ? `/api/portfolio/${selectedProductId}/goals` : null)
    return (
        <div className='grid min-h-0 flex-1 gap-x-8 gap-y-4 overflow-hidden pt-3 md:grid-cols-2'>
            <GoalsColumn scope='account' goals={account.goals} loading={account.loading} emptyMessage='Launch products and connect data to earn portfolio goals.' />
            <GoalsColumn
                scope='project'
                name={productName ?? undefined}
                goals={project.goals}
                loading={project.loading}
                emptyMessage={selectedProductId ? 'Connect this product’s data to track goals.' : 'Select a launched product to see its goals.'}
            />
        </div>
    )
}

// Portfolio-level (account-scoped) goals.
export function AccountGoalsCard() {
    const { goals, loading } = useGoals('/api/portfolio/goals')
    return <GoalsCard title='Goals' goals={goals} loading={loading} emptyMessage='Launch products and connect data to start earning portfolio goals.' />
}

// Per-project goals for a launched product.
export function ProjectGoalsCard({ pipelineId }: { pipelineId: string | null }) {
    const { goals, loading } = useGoals(pipelineId ? `/api/portfolio/${pipelineId}/goals` : null)
    return <GoalsCard title='Goals' goals={goals} loading={loading} emptyMessage='Connect this product’s data to start tracking goals.' />
}
