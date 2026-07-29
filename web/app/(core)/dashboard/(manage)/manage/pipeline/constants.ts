import type { PipelineLifecycleStage } from '@/lib/pipelineLifecycle'

export const STAGES: { id: PipelineLifecycleStage; label: string }[] = [
    { id: 'watching',   label: 'Watching' },
    { id: 'building',   label: 'Building' },
    { id: 'launched',   label: 'Launched' },
]
