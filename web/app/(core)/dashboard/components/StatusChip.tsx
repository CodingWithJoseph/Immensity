import SemanticChip from '@/app/(core)/dashboard/components/SemanticChip'
import { PROJECT_STATUS_CHIPS, type ProjectStatusChip } from '@/app/(core)/dashboard/components/chipSets'

export type StatusChipStatus = ProjectStatusChip

export default function StatusChip({ status, semantic = false }: { status: StatusChipStatus; semantic?: boolean }) {
    const config = PROJECT_STATUS_CHIPS[status]
    return <SemanticChip definition={config} semantic={semantic} />
}
