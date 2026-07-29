import { Building2, FolderGit2 } from 'lucide-react'
import type { GoalScope } from '@/lib/goalsView'

// A small, colour-coded tag that marks a goal's scope: Account (portfolio-wide,
// blue) vs Project (one product, accent). Used wherever goals appear so the two
// kinds are legible at a glance — "Problems discovered" (account) vs "Problems
// defined" (project) no longer look alike.
export function ScopeBadge({ scope, name, className = '' }: { scope: GoalScope; name?: string; className?: string }) {
    const isAccount = scope === 'account'
    const Icon = isAccount ? Building2 : FolderGit2
    const label = isAccount ? 'Account' : (name ?? 'Project')
    return (
        <span
            title={isAccount ? 'Account goal (portfolio-wide)' : `Project goal${name ? ` · ${name}` : ''}`}
            className={`inline-flex max-w-40 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${isAccount ? 'border-(--color-blue) bg-(--color-blue-soft) text-(--color-blue)' : 'border-(--color-accent) bg-(--color-accent-soft) text-(--color-accent)'} ${className}`}
        >
            <Icon className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{label}</span>
        </span>
    )
}
