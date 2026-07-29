import { CORE_ITEMS, MANAGE_ITEMS } from '@/app/(core)/dashboard/components/Sidebar'
import { routes } from '@/app/util/routes'

describe('Manage sidebar navigation', () => {
    it('includes a Goals entry pointing at the goals route', () => {
        const goals = MANAGE_ITEMS.find(item => item.key === 'goals')
        expect(goals).toBeDefined()
        expect(goals?.label).toBe('Goals')
        expect(goals?.href).toBe(routes.core.goals)
    })

    it('places Goals immediately before Calendar', () => {
        const keys = MANAGE_ITEMS.map(item => item.key)
        expect(keys).toContain('goals')
        expect(keys).toContain('calendar')
        // Goals guides what appears on the calendar, so it comes first.
        expect(keys.indexOf('goals')).toBe(keys.indexOf('calendar') - 1)
    })
})

describe('Core release navigation', () => {
    it('puts the complete initial-release workflow in one sidebar', () => {
        expect(CORE_ITEMS.map(item => [item.label, item.href])).toEqual([
            ['Search', routes.core.explore],
            ['Pipeline', routes.core.pipeline],
            ['Software Plan', routes.core.problems],
            ['Signal', routes.core.signal],
        ])
    })

    it('does not expose dashboard or deferred section navigation', () => {
        const keys = CORE_ITEMS.map(item => item.key)
        expect(keys).not.toContain('dashboard')
        expect(keys).not.toContain('build')
        expect(keys).not.toContain('manage')
        expect(keys).not.toContain('monitor')
        expect(keys).not.toContain('settings')
    })
})
