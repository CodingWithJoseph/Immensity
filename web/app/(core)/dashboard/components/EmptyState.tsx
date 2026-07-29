import { ButtonLink } from '@/app/(core)/dashboard/components/Button'
import type { ReactNode } from 'react'

export default function EmptyState({
    title,
    description,
    actionLabel,
    actionHref,
    compact = false,
}: {
    title: string
    description?: ReactNode
    actionLabel?: string
    actionHref?: string
    compact?: boolean
}) {
    return (
        <div className={`flex flex-col items-center justify-center rounded-md border border-(--color-border) text-center ${compact ? 'min-h-32 p-4' : 'min-h-64 gap-3 p-8'}`}>
            <p className={`${compact ? 'text-xs font-medium' : 'text-sm font-semibold'} text-(--color-text)`}>{title}</p>
            {description && <div className="max-w-sm text-sm text-(--color-text-muted)">{description}</div>}
            {actionLabel && actionHref && <ButtonLink href={actionHref} variant="primary" className="mt-1">{actionLabel}</ButtonLink>}
        </div>
    )
}
