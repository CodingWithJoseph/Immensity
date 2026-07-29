'use client'

import SemanticChip from '@/app/(core)/dashboard/components/SemanticChip'
import { PIPELINE_METADATA_CHIPS } from '@/app/(core)/dashboard/components/chipSets'

function getDaysSinceUpdate(updatedAt: string): number {
    return Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24))
}

export default function StalenessIndicator({ updatedAt }: { updatedAt: string }) {
    const days = getDaysSinceUpdate(updatedAt)

    if (days < 7) return null

    return (
        <SemanticChip
            definition={PIPELINE_METADATA_CHIPS.stale}
            label={days >= 14 ? `${days} days inactive - act or kill` : `${days} days inactive`}
        />
    )
}
