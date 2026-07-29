import {
    dayDistance,
    daysSince,
    lifecycleStage,
    projectReadiness,
} from '@/lib/pipelineLifecycle'

describe('pipeline lifecycle helpers', () => {
    it('maps legacy pre-launch stages into Watching and keeps launched projects distinct', () => {
        expect(lifecycleStage({ stage: 'validating', launchedAt: null })).toBe('watching')
        expect(lifecycleStage({ stage: 'building', launchedAt: null })).toBe('building')
        expect(lifecycleStage({ stage: 'watching', launchedAt: '2026-06-01T00:00:00Z' })).toBe('launched')
    })

    it('derives readiness from saved problems, tasks, built tasks, and problem-task pairs', () => {
        const readiness = projectReadiness(
            [{ id: 'problem-1' }, { id: 'problem-2' }],
            [
                { id: 'task-1', problemId: 'problem-1', status: 'done' },
                { id: 'task-2', problemId: 'problem-1', status: 'in_progress' },
                { id: 'task-3', problemId: 'problem-2', status: 'todo' },
            ],
        )

        expect(readiness).toEqual(expect.objectContaining({
            target: 20,
            verifiedProblems: 2,
            verifiedTasks: 3,
            builtTasks: 1,
            verifiedPairs: 2,
            percent: 10,
            status: 'at-risk',
        }))
    })

    it('calculates launch timing in whole days', () => {
        const now = new Date('2026-06-28T12:00:00Z')
        expect(dayDistance('2026-07-01T12:00:00Z', now)).toBe(3)
        expect(daysSince('2026-06-25T12:00:00Z', now)).toBe(3)
    })
})
