import type { ReactNode } from 'react'

export default function DetailRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex min-h-8 items-center justify-between gap-4 py-1.5">
            <span className="text-xs text-(--color-text-muted)">{label}</span>
            <div className="min-w-0 text-right text-xs font-medium text-(--color-text)">{children}</div>
        </div>
    )
}
