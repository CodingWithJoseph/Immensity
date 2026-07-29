import { ReactNode } from 'react'

export default function DashboardEmptyState({ children }: { children: ReactNode }) {
    return (
        <div className='flex min-h-0 flex-1 items-center justify-center rounded-md border border-dashed border-(--color-border) bg-transparent p-4 text-center text-xs text-(--color-text-muted)'>
            {children}
        </div>
    )
}
