import type { ComponentType } from 'react'

export type ChipTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'muted'
export type ChipSize = 'default' | 'count'
export type ChipAppearance = 'outlined' | 'filled'

const outlinedToneClass: Record<ChipTone, string> = {
    neutral: 'border-(--color-border) bg-(--color-bg) text-(--color-text-muted)',
    info: 'border-(--color-blue) bg-(--color-blue-soft) text-(--color-blue)',
    success: 'border-(--color-success) bg-(--color-success-soft) text-(--color-success-text)',
    warning: 'border-(--color-warning) bg-(--color-warning-soft) text-(--color-warning)',
    danger: 'border-(--color-error) bg-(--color-error-soft) text-(--color-error)',
    muted: 'border-(--color-border) bg-(--color-surface-tint) text-(--color-text-faint)',
}

const filledToneClass: Record<ChipTone, string> = {
    neutral: 'bg-[var(--chip-neutral-bg)] text-[var(--chip-neutral-text)]',
    info: 'bg-[var(--chip-info-bg)] text-[var(--chip-info-text)]',
    success: 'bg-[var(--chip-success-bg)] text-[var(--chip-success-text)]',
    warning: 'bg-[var(--chip-warning-bg)] text-[var(--chip-warning-text)]',
    danger: 'bg-[var(--chip-danger-bg)] text-[var(--chip-danger-text)]',
    muted: 'bg-[var(--chip-neutral-bg)] text-[var(--chip-neutral-text)]',
}

const sizeClass: Record<ChipSize, string> = {
    default: 'min-h-6 max-w-full px-2.5 py-1',
    count: 'h-6 min-w-6 justify-center px-1.5 py-1',
}

export default function Chip({
    label,
    count,
    tone = 'neutral',
    size = 'default',
    appearance = 'outlined',
    icon: Icon,
}: {
    label: string
    count?: number
    tone?: ChipTone
    size?: ChipSize
    appearance?: ChipAppearance
    icon?: ComponentType<{ size?: number; 'aria-hidden'?: boolean }>
}) {
    return (
        <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md text-[10px] ${sizeClass[size]} ${appearance === 'filled' ? `border-0 font-bold leading-normal ${filledToneClass[tone]}` : `border font-medium leading-none ${outlinedToneClass[tone]}`}`}>
            {Icon && <Icon size={12} aria-hidden />}
            <span className="truncate">{count == null ? label : `${count} ${label}`}</span>
        </span>
    )
}

