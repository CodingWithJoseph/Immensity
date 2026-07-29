import Chip, { type ChipSize } from '@/app/(core)/dashboard/components/Chip'
import type { ChipSetDefinition } from '@/app/(core)/dashboard/components/chipSets'

export default function SemanticChip({
    definition,
    label = definition.label,
    count,
    size = 'default',
    semantic = true,
}: {
    definition: ChipSetDefinition
    label?: string
    count?: number
    size?: ChipSize
    semantic?: boolean
}) {
    return (
        <Chip
            label={label}
            count={count}
            size={size}
            tone={semantic ? definition.tone : 'neutral'}
            appearance={semantic ? definition.appearance : 'outlined'}
        />
    )
}
