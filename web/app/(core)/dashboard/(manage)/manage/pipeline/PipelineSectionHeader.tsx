import type { ReactNode } from 'react'
import SemanticChip from '@/app/(core)/dashboard/components/SemanticChip'
import type { ChipSetDefinition } from '@/app/(core)/dashboard/components/chipSets'

export default function PipelineSectionHeader({
    title,
    count,
    countDefinition,
    action,
}: {
    title: string
    count?: number
    countDefinition?: ChipSetDefinition
    action?: ReactNode
}) {
    return (
        <div className="flex min-h-6 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
                <h3 className="truncate text-xs font-semibold uppercase tracking-widest text-(--color-text)">{title}</h3>
                {count != null && countDefinition && (
                    <SemanticChip definition={countDefinition} label={String(count)} size="count" />
                )}
            </div>
            {action}
        </div>
    )
}
