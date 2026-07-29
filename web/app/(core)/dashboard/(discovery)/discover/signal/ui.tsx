'use client'
import type { ReactNode } from 'react'
import type { Momentum } from '@/lib/types/signals'

// Shared presentational primitives for the Signals page. These match the app's
// existing card / typography / spacing conventions (surface card, --color-*
// tokens, rounded-2xl, p-6).

export function Card({
    children,
    className = '',
    onClick,
}: {
    children: ReactNode
    className?: string
    onClick?: () => void
}) {
    return (
        <section
            onClick={onClick}
            className={`bg-(--color-surface) border border-(--color-border) rounded-2xl p-6 ${className}`}
        >
            {children}
        </section>
    )
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
    return (
        <div className='flex items-baseline justify-between gap-3 mb-4'>
            <h2 className='text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)'>{children}</h2>
            {hint != null && <span className='text-xs text-(--color-text-muted)'>{hint}</span>}
        </div>
    )
}

const MOMENTUM_STYLE: Record<Momentum, { bg: string; color: string; label: string }> = {
    growing: { bg: 'var(--color-blue-soft)', color: 'var(--color-blue)', label: 'Growing' },
    steady: { bg: 'var(--color-surface-tint)', color: 'var(--color-text-muted)', label: 'Steady' },
    fading: { bg: 'var(--color-error-soft)', color: 'var(--color-error)', label: 'Fading' },
}

export function MomentumBadge({ momentum }: { momentum: Momentum }) {
    const s = MOMENTUM_STYLE[momentum]
    return (
        <span
            className='inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full'
            style={{ backgroundColor: s.bg, color: s.color }}
        >
            <span className='w-1.5 h-1.5 rounded-full' style={{ backgroundColor: s.color }} />
            {s.label}
        </span>
    )
}

export function Pill({ children }: { children: ReactNode }) {
    return (
        <span className='text-xs font-medium px-2.5 py-1 rounded-full bg-(--color-bg) text-(--color-text-muted)'>
            {children}
        </span>
    )
}

// Simple grey pulse block used for loading skeletons across data-driven sections.
export function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`animate-pulse bg-(--color-border) rounded-lg ${className}`} />
}

export function CardSkeleton({ lines = 4, height = 'h-4' }: { lines?: number; height?: string }) {
    return (
        <Card>
            <Skeleton className='h-3 w-32 mb-5' />
            <div className='flex flex-col gap-3'>
                {Array.from({ length: lines }).map((_, i) => (
                    <Skeleton key={i} className={`${height} w-full`} />
                ))}
            </div>
        </Card>
    )
}
