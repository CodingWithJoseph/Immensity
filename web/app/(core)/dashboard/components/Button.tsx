import type { ButtonHTMLAttributes, ReactNode } from 'react'
import Link from 'next/link'

export type ButtonVariant = 'primary' | 'secondary' | 'danger'
export type ButtonSize = 'sm' | 'md'

const variantClass: Record<ButtonVariant, string> = {
    primary: 'border-(--color-button) bg-(--color-button) text-(--color-on-button) hover:border-(--color-button-hover) hover:bg-(--color-button-hover)',
    secondary: 'border-(--color-border) bg-transparent text-(--color-text) hover:bg-(--color-bg)',
    danger: 'border-(--color-border) bg-transparent text-(--color-error) hover:border-(--color-error) hover:bg-(--color-error-soft)',
}

const sizeClass: Record<ButtonSize, string> = {
    sm: 'min-h-9 px-3 py-2 text-xs',
    md: 'min-h-10 px-4 py-2 text-sm',
}

export function buttonClassName({
    variant = 'secondary',
    size = 'md',
    className = '',
}: {
    variant?: ButtonVariant
    size?: ButtonSize
    className?: string
} = {}) {
    return `inline-flex items-center justify-center rounded-md border font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--color-focus) focus-visible:ring-offset-1 focus-visible:ring-offset-(--color-surface) disabled:pointer-events-none disabled:opacity-50 ${variantClass[variant]} ${sizeClass[size]} ${className}`
}

export function Button({
    variant = 'secondary',
    size = 'md',
    className = '',
    type = 'button',
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant
    size?: ButtonSize
}) {
    return <button type={type} className={buttonClassName({ variant, size, className })} {...props} />
}

export function ButtonLink({
    href,
    children,
    variant = 'secondary',
    size = 'md',
    className = '',
}: {
    href: string
    children: ReactNode
    variant?: ButtonVariant
    size?: ButtonSize
    className?: string
}) {
    return (
        <Link href={href} className={buttonClassName({ variant, size, className })}>
            {children}
        </Link>
    )
}
