import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function source(file: string) {
    return fs.readFileSync(path.join(root, file), 'utf8')
}

describe('X close and dismiss controls', () => {
    it.each([
        'app/(core)/dashboard/(manage)/manage/pipeline/PipelineCardPanel.tsx',
        'app/(core)/dashboard/(discovery)/discover/search/ClusterDetailPanel.tsx',
        'app/(core)/dashboard/layout.tsx',
        'components/FirstRunTip.tsx',
        'components/NavigationBar.tsx',
    ])('uses the shared red hover cue in %s', file => {
        expect(source(file)).toContain('hover:text-(--color-error)')
    })

    it.each([
        'app/(core)/dashboard/(manage)/manage/pipeline/PipelineCardPanel.tsx',
        'app/(core)/dashboard/(discovery)/discover/search/ClusterDetailPanel.tsx',
    ])('turns the existing close-button border red in %s', file => {
        expect(source(file)).toContain('hover:border-(--color-error)')
    })
})
