import fs from 'node:fs'
import path from 'node:path'

function source(file: string): string {
    return fs.readFileSync(path.join(process.cwd(), file), 'utf8')
}

describe('semantic status colors', () => {
    it('uses amber for non-critical due-date warnings', () => {
        expect(source('lib/dueDates.ts')).toContain('bg-(--color-warning-soft) text-(--color-warning)')
        expect(source('lib/calendarEvents.ts')).toContain("case 'due-soon': return 'bg-(--color-warning)'")
    })

    it('uses blue for healthy products and improving trends', () => {
        const files = [
            'app/(core)/dashboard/components/DashboardMonitorCards.tsx',
            'app/(core)/dashboard/components/DiscoveryActivityCard.tsx',
            'app/(core)/dashboard/components/MomentumMoversCard.tsx',
            'app/(core)/dashboard/(monitor)/monitor/components/CommandCenterPanel.tsx',
            'app/(core)/dashboard/(monitor)/monitor/components/IssuesPanel.tsx',
            'app/(core)/dashboard/(monitor)/monitor/components/SituationSummary.tsx',
            'app/(core)/dashboard/(monitor)/monitor/components/UsageOverview.tsx',
        ]

        for (const file of files) {
            const contents = source(file)
            expect(contents).toContain('--color-blue')
            expect(contents).not.toContain('text-(--color-success)')
        }
    })

    it('keeps green reserved for explicit completion and live confirmation', () => {
        expect(source('lib/calendarEvents.ts')).toContain("task.status === 'done'")
        expect(source('lib/calendarEvents.ts')).toContain('bg-(--color-success)')
        expect(source('app/(landing)/demo/DemoHero.tsx')).toContain('bg-(--color-success)')
    })

    it('does not retain the ambiguous positive color alias', () => {
        expect(source('app/globals.css')).not.toContain('--positive:')
    })
})
