import SemanticChip from '@/app/(core)/dashboard/components/SemanticChip'
import { PROJECT_HEALTH_CHIPS, type ProjectHealthChip } from '@/app/(core)/dashboard/components/chipSets'

export default function HealthChip({ health, semantic = false }: { health: ProjectHealthChip; semantic?: boolean }) {
    const config = PROJECT_HEALTH_CHIPS[health]
    return <SemanticChip definition={config} semantic={semantic} />
}
