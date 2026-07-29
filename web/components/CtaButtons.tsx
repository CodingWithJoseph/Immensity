import Link from 'next/link'
import { routes } from '@/app/util/routes'

/**
 * The two — and only two — site-wide CTAs.
 *   Primary:   "Start free"          → sign up
 *   Secondary: "See how it works"    → /demo (the live "prove it" view)
 *
 * Centralized so naming + destinations never drift again.
 */

export const CTA_PRIMARY_LABEL = 'Start free'
export const CTA_SECONDARY_LABEL = 'See how it works'

type Size = 'md' | 'lg'

const sizeMap: Record<Size, string> = {
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
}

export function PrimaryCta({
    size = 'md',
    href = routes.auth.signUp,
    label = CTA_PRIMARY_LABEL,
    className = '',
}: {
    size?: Size
    href?: string
    label?: string
    className?: string
}) {
    return (
        <Link
            href={href}
            className={`pf-button pf-button--solid ${sizeMap[size]} ${className}`}
        >
            {label}
        </Link>
    )
}

export function SecondaryCta({
    size = 'md',
    href = routes.landing.demo,
    label = CTA_SECONDARY_LABEL,
    className = '',
}: {
    size?: Size
    href?: string
    label?: string
    className?: string
}) {
    return (
        <Link
            href={href}
            className={`pf-button ${sizeMap[size]} ${className}`}
        >
            {label}
            <span aria-hidden className="text-(--ink-muted)">→</span>
        </Link>
    )
}

export function DualCta({
    size = 'lg',
    className = '',
}: {
    size?: Size
    className?: string
}) {
    return (
        <div className={`pf-cta__actions ${className}`}>
            <PrimaryCta size={size} />
            <SecondaryCta size={size} />
        </div>
    )
}
