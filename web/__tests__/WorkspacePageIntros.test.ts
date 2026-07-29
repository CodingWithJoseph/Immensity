import fs from 'node:fs'
import path from 'node:path'

const dashboardRoot = path.join(process.cwd(), 'app', '(core)', 'dashboard')
const featureRoots = ['(build)', '(building)', '(discovery)', '(manage)', '(monitor)']

function sourceFiles(root: string): string[] {
    return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
        const fullPath = path.join(root, entry.name)
        if (entry.isDirectory()) return sourceFiles(fullPath)
        return /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : []
    })
}

describe('internal workspace page intros', () => {
    const sources = featureRoots.flatMap(root => sourceFiles(path.join(dashboardRoot, root)))

    it('does not render the shared page intro header in feature workspaces', () => {
        for (const file of sources) {
            const source = fs.readFileSync(file, 'utf8')
            expect(source).not.toContain("components/PageHeader")
            expect(source).not.toContain('<PageHeader')
        }
    })

    it('does not restore removed explanatory intro copy', () => {
        const combined = sources.map(file => fs.readFileSync(file, 'utf8')).join('\n')
        const removedCopy = [
            'Plan the work attached to the selected project and team.',
            'Your recurring revenue, where it moved, and whether retention is healthy.',
            'Which product behaviors predict expansion vs churn, from the usage',
            'Create a collaboration layer for the people moving projects and issues forward.',
            'Task due dates and launch milestones for the selected project.',
            'Inspect demand signal and evidence for the selected project.',
        ]

        for (const copy of removedCopy) expect(combined).not.toContain(copy)
    })
})
