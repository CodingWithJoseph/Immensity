import React from 'react'

/**
 * Reusable loading skeletons built on the app's animate-pulse + --color-border
 * pattern. Use these for content areas (lists, grids, boards). For small inline
 * cases use LoadingInline (spinner + label).
 */

export function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`animate-pulse rounded bg-(--color-border) ${className}`} />
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
    return (
        <div className={`animate-pulse flex flex-col gap-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <div key={i} className={`h-3 rounded bg-(--color-border) ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
            ))}
        </div>
    )
}

export function SkeletonCards({
    count = 4,
    className = '',
    cardClassName = 'h-40',
}: {
    count?: number
    className?: string
    cardClassName?: string
}) {
    return (
        <div className={`grid gap-4 animate-pulse ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className={`rounded-2xl bg-(--color-border) ${cardClassName}`} />
            ))}
        </div>
    )
}

export function LoadingInline({ label = 'Loading…', className = '' }: { label?: string; className?: string }) {
    return (
        <span className={`inline-flex items-center gap-2 text-sm text-(--color-text-muted) ${className}`}>
            <span
                className="w-3.5 h-3.5 rounded-full border-2 border-(--color-border) border-t-(--color-text) animate-spin"
                aria-hidden
            />
            {label}
        </span>
    )
}
