'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { routes } from '@/app/util/routes'
import { config } from '@/lib/config'
import { fetchJson } from '@/lib/fetchJson'

const STEPS = [
    {
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
        ),
        title: 'Explore',
        description: 'Browse AI-scored opportunities surfaced from Reddit, HackerNews, and forums. Add anything interesting to your pipeline.',
        step: '01',
    },
    {
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="4" height="18" rx="1"/>
                <rect x="10" y="6" width="4" height="15" rx="1"/>
                <rect x="17" y="9" width="4" height="12" rx="1"/>
            </svg>
        ),
        title: 'Pipeline',
        description: 'Manage your opportunities through four stages — Watching, Exploring, Validating, Building. Each stage unlocks new tools.',
        step: '02',
    },
    {
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
        ),
        title: 'Workspace',
        description: 'Each pipeline card has a workspace that adapts to your current stage with signal analysis, concept angles, validation tools, and more.',
        step: '03',
    },
    {
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            </svg>
        ),
        title: 'Portfolio',
        description: 'When you launch a product, it moves out of the pipeline and into your Portfolio — a trophy shelf tracking your MRR across all launched products.',
        step: '04',
    },
]

// Focus areas mirror the AI pipeline's industry taxonomy so a user's picks can
// later filter the Explore feed.
const FOCUS_AREAS = [
    'healthcare', 'fintech & personal finance', 'productivity', 'developer tools',
    'education', 'e-commerce', 'real estate & housing', 'transportation',
    'food & beverage', 'parenting & family', 'pet care', 'hr & recruiting',
    'legal', 'marketing & sales', 'home & living', 'mental health & wellness',
    'sustainability', 'gaming',
]

export default function OnboardingPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [selected, setSelected] = useState<Set<string>>(new Set())

    const toggle = (area: string) =>
        setSelected(prev => {
            const next = new Set(prev)
            if (next.has(area)) next.delete(area)
            else next.add(area)
            return next
        })

    const handleStart = async () => {
        setLoading(true)
        try {
            await fetchJson('/api/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ focusAreas: [...selected] }),
            })
            // Surface a one-time tip on the Explore page for first-time users.
            if (typeof window !== 'undefined') localStorage.setItem('pf_onboarding_tip', '1')
            router.push(routes.core.explore)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-(--color-bg) flex flex-col items-center justify-center px-8 py-16">
            <div className="max-w-4xl w-full flex flex-col items-center gap-12">

                <div className="flex flex-col items-center gap-3 text-center">
                    <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">Welcome to {config.company.name}</p>
                    <h1 className="text-4xl font-semibold text-(--color-text)">From idea to launch,<br />in one place.</h1>
                    <p className="text-base text-(--color-text-muted) max-w-md">
                        {config.company.name} surfaces real problems people are paying to solve, then gives you the tools to validate and build a product around them.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                    {STEPS.map((step, i) => (
                        <div key={step.step} className="flex flex-col gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-(--color-text) text-(--color-bg) flex items-center justify-center shrink-0">
                                    {step.icon}
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div className="flex-1 h-px bg-(--color-border)" />
                                )}
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-(--color-border)">{step.step}</span>
                                    <span className="text-sm font-semibold text-(--color-text)">{step.title}</span>
                                </div>
                                <p className="text-xs text-(--color-text-muted) leading-relaxed">{step.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="w-full flex flex-col items-center gap-4 border-t border-(--color-border) pt-10">
                    <div className="text-center flex flex-col gap-1">
                        <h2 className="text-lg font-semibold text-(--color-text)">What are you interested in?</h2>
                        <p className="text-sm text-(--color-text-muted) max-w-md">
                            Pick a few focus areas so we can point you at the most relevant problems. Optional — you can change this anytime in Settings.
                        </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
                        {FOCUS_AREAS.map(area => {
                            const active = selected.has(area)
                            return (
                                <button
                                    key={area}
                                    type="button"
                                    onClick={() => toggle(area)}
                                    aria-pressed={active}
                                    className={`text-xs px-3 py-1.5 rounded-full border capitalize transition-colors ${
                                        active
                                            ? 'bg-(--color-text) text-(--color-bg) border-(--color-text)'
                                            : 'border-(--color-border) text-(--color-text-muted) hover:text-(--color-text)'
                                    }`}>
                                    {area}
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="flex flex-col items-center gap-3">
                    <button
                        onClick={handleStart}
                        disabled={loading}
                        className="rounded-xl bg-(--color-button) px-8 py-3 text-sm font-medium text-(--color-on-button) transition-colors hover:bg-(--color-button-hover) disabled:opacity-50">
                        {loading ? 'Getting started...' : selected.size > 0 ? `Start Exploring (${selected.size}) →` : 'Start Exploring →'}
                    </button>
                    <p className="text-xs text-(--color-text-muted)">You can always revisit this from Settings</p>
                </div>
            </div>
        </div>
    )
}
