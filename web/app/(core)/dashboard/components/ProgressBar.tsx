import type { ReactNode } from 'react'

export type ProgressTone = 'process' | 'success'
export type ProgressSize = 'xs' | 'sm' | 'md'

const sizeClass: Record<ProgressSize, string> = {
    xs: 'h-1.5',
    sm: 'h-3',
    md: 'h-5',
}

function clampPercent(value: number, max: number): number {
    return max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
}

export default function ProgressBar({
    value,
    max,
    tone = 'process',
    size = 'md',
    className = '',
    fillClassName,
    rounded = 'rounded-full',
}: {
    value: number
    max: number
    tone?: ProgressTone
    size?: ProgressSize
    className?: string
    // Override the fill colour (e.g. pipeline phase colours). Wins over `tone`.
    fillClassName?: string
    // Corner rounding for the track + fill; pass a single class so it never
    // conflicts with the default (e.g. 'rounded-none' for a full-bleed edge bar).
    rounded?: string
}) {
    const percent = clampPercent(value, max)
    const fillColor = fillClassName ?? (tone === 'success' ? 'bg-(--color-success)' : 'bg-(--color-blue)')

    return (
        <div
            className={`overflow-hidden ${rounded} bg-(--color-surface-tint) ${sizeClass[size]} ${className}`}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={Math.min(max, Math.max(0, value))}
        >
            <div className={`pf-bar-fill h-full ${rounded} ${fillColor}`} style={{ width: `${percent}%` }} />
        </div>
    )
}

export type ProgressLabelFormat = 'of' | 'slash'

// Single-line progress row: title (left) | bar (flexible middle) | current/target
// label (right). The one layout used everywhere progress is shown — modelled on
// the Readiness panel rows (Breakdown verified / Tasks verified).
export function ProgressRow({
    title,
    current,
    target,
    format = 'slash',
    formatValue = (n: number) => `${n}`,
    label,
    tone = 'process',
    titleClassName = 'w-36',
    bar,
}: {
    title: string
    current: number
    target: number
    format?: ProgressLabelFormat
    // Format each side of the label (e.g. dollars, compact counts).
    formatValue?: (value: number) => string
    // Override the right-hand label entirely (e.g. "Complete").
    label?: string
    tone?: ProgressTone
    titleClassName?: string
    // Optional replacement for the middle bar (e.g. a step indicator). Defaults
    // to the shared ProgressBar.
    bar?: ReactNode
}) {
    const separator = format === 'of' ? 'of' : '/'
    const rightLabel = label ?? `${formatValue(current)} ${separator} ${formatValue(target)}`

    return (
        <div className="flex items-center gap-3 py-1.5">
            <span className={`shrink-0 truncate text-xs text-(--color-text-muted) ${titleClassName}`} title={title}>{title}</span>
            {bar ?? <ProgressBar value={current} max={target} tone={tone} size="sm" className="min-w-0 flex-1" />}
            <span className="shrink-0 whitespace-nowrap text-right text-xs font-medium tabular-nums text-(--color-text)">{rightLabel}</span>
        </div>
    )
}
