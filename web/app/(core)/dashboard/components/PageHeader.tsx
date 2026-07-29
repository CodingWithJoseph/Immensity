import type { ReactNode } from 'react'

type PageHeaderProps = {
    eyebrow: string
    title: ReactNode
    description?: ReactNode
    actions?: ReactNode
    children?: ReactNode
}

export default function PageHeader({ eyebrow, title, description, actions, children }: PageHeaderProps) {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">{eyebrow}</p>
                    <h1 className="mt-2 text-2xl font-semibold text-(--color-text)">{title}</h1>
                    {description && <div className="mt-1 text-sm text-(--color-text-muted)">{description}</div>}
                </div>
                {actions}
            </div>
            {children}
        </div>
    )
}
