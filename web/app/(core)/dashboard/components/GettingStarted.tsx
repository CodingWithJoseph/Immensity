'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronRight, Compass } from 'lucide-react'
import { fetchJson } from '@/lib/fetchJson'
import { ProgressRow } from '@/app/(core)/dashboard/components/ProgressBar'
import { stepHref, type GettingStarted } from '@/lib/types/gettingStarted'

// Self-fetching so any surface (Goals rail, Timeline hint) can drop it in.
// Returns null while loading or if the guide is unavailable.
export function useGettingStarted(): { data: GettingStarted | null; loading: boolean } {
    const [data, setData] = useState<GettingStarted | null>(null)
    const [loading, setLoading] = useState(true)
    useEffect(() => {
        let active = true
        fetchJson<{ data: GettingStarted }>('/api/portfolio/getting-started')
            .then(j => { if (active) setData(j?.data ?? null) })
            .catch(() => { if (active) setData(null) })
            .finally(() => { if (active) setLoading(false) })
        return () => { active = false }
    }, [])
    return { data, loading }
}

// Full onboarding checklist for the Goals-page rail: the ordered steps with
// their completion state and a prominent "do this next" call to action.
export function GettingStartedCard() {
    const { data, loading } = useGettingStarted()
    if (loading || !data || data.complete || !Array.isArray(data.steps)) return null

    return (
        <div className="rounded-md border border-(--color-border) bg-(--color-card) p-4">
            <div className="mb-1 flex items-center gap-2">
                <Compass className="h-4 w-4 text-(--color-accent)" aria-hidden />
                <h2 className="text-sm font-semibold text-(--color-text)">Getting started</h2>
            </div>
            <p className="mb-3 text-xs text-(--color-text-muted)">
                A quick path through the essentials. Numeric goals kick in once these are done.
            </p>

            <ProgressRow title="Setup progress" current={data.completedCount} target={data.totalCount} label={`${data.completedCount}/${data.totalCount}`} />

            <ol className="mt-3 flex flex-col gap-1.5">
                {data.steps.map(step => {
                    const isNext = data.nextStep?.key === step.key
                    return (
                        <li key={step.key}>
                            <Link
                                href={stepHref(step.routeKey)}
                                className={`flex items-start gap-2.5 rounded-md px-2 py-1.5 text-xs transition-colors ${isNext ? 'bg-(--color-accent-soft)' : 'hover:bg-(--color-bg)'}`}
                            >
                                <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${step.done ? 'border-(--color-success) bg-(--color-success) text-(--color-on-button)' : isNext ? 'border-(--color-accent)' : 'border-(--color-border)'}`}>
                                    {step.done && <Check className="h-3 w-3" aria-hidden />}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className={`block font-medium ${step.done ? 'text-(--color-text-muted) line-through' : 'text-(--color-text)'}`}>{step.title}</span>
                                    {isNext && <span className="mt-0.5 block text-(--color-text-muted)">{step.description}</span>}
                                </span>
                                {isNext && <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-(--color-accent)" aria-hidden />}
                            </Link>
                        </li>
                    )
                })}
            </ol>
        </div>
    )
}

// Compact "do this next" hint for the Timeline header — one line pointing at the
// next onboarding action, so the timeline is a set of next steps, not just a
// picture. Renders nothing once onboarding is complete.
export function GettingStartedNextHint({ className }: { className?: string }) {
    const { data, loading } = useGettingStarted()
    const next = data?.nextStep
    if (loading || !next) return null

    return (
        <Link
            href={stepHref(next.routeKey)}
            className={`group flex items-center gap-2 rounded-md border border-(--color-border) bg-(--color-card) px-3 py-2 text-xs shadow-[var(--shadow-sm)] transition-colors hover:border-(--color-accent) ${className ?? ''}`}
        >
            <Compass className="h-3.5 w-3.5 shrink-0 text-(--color-accent)" aria-hidden />
            <span className="text-(--color-text-muted)">Do this next</span>
            <span className="min-w-0 truncate font-medium text-(--color-text)">{next.title}</span>
            <span className="ml-auto flex shrink-0 items-center gap-1 font-semibold text-(--color-link) group-hover:text-(--color-link-hover)">
                {next.actionLabel}
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </span>
        </Link>
    )
}
