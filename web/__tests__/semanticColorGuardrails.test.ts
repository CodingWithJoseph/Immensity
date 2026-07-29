import fs from 'node:fs'
import path from 'node:path'

const sourceRoots = ['app', 'components', 'lib']
const sourceExtensions = new Set(['.css', '.ts', '.tsx'])

function sourceFiles(directory: string): string[] {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const target = path.join(directory, entry.name)
        if (entry.isDirectory()) return sourceFiles(target)
        return sourceExtensions.has(path.extname(entry.name)) ? [target] : []
    })
}

const files = sourceRoots.flatMap(root => sourceFiles(path.join(process.cwd(), root)))
const componentFiles = files.filter(file => file.endsWith('.tsx'))

function matchingLines(file: string, pattern: RegExp): string[] {
    return fs.readFileSync(file, 'utf8')
        .split('\n')
        .filter(line => pattern.test(line))
}

describe('semantic color guardrails', () => {
    it('keeps semantic hex values centralized in globals.css', () => {
        const semanticHex = /#(?:50FFB1|F50F0F|1560BD|FF7008|9A6700|E3B341)/i
        const allowed = path.join(process.cwd(), 'app', 'globals.css')
        const offenders = files.filter(file => file !== allowed && semanticHex.test(fs.readFileSync(file, 'utf8')))

        expect(offenders).toEqual([])
    })

    it('uses semantic tokens instead of named Tailwind color utilities', () => {
        const namedUtility = /(?:text|bg|border|ring|outline|stroke|fill)-(?:red|green|blue|orange|amber|yellow|emerald|teal)-\d{2,3}\b/
        const offenders = componentFiles.filter(file => namedUtility.test(fs.readFileSync(file, 'utf8')))

        expect(offenders).toEqual([])
    })

    it('does not restore deprecated ambiguous aliases', () => {
        const deprecatedAlias = /--(?:positive(?:-soft)?|color-teal)\b/
        const offenders = files.filter(file => deprecatedAlias.test(fs.readFileSync(file, 'utf8')))

        expect(offenders).toEqual([])
    })

    it('gives every charcoal button its darker hover state', () => {
        // Decorative (aria-hidden) surfaces — e.g. avatar badges that reuse the
        // charcoal button token as a background — are not interactive and so have
        // no hover state to enforce. Only interactive charcoal buttons need the
        // darker hover.
        const offenders = componentFiles.flatMap(file => matchingLines(file, /bg-\(--color-button\)/)
            .filter(line => !line.includes('hover:bg-(--color-button-hover)') && !line.includes('aria-hidden'))
            .map(line => `${path.relative(process.cwd(), file)}: ${line.trim()}`))

        expect(offenders).toEqual([])
    })

    it('gives every blue link its darker hover state', () => {
        const offenders = componentFiles.flatMap(file => matchingLines(file, /text-\(--color-link\)/)
            .filter(line => !line.includes('hover:text-(--color-link-hover)'))
            .map(line => `${path.relative(process.cwd(), file)}: ${line.trim()}`))

        expect(offenders).toEqual([])
    })

    it('maps directional momentum to blue and red rather than orange', () => {
        const signalUi = fs.readFileSync(path.join(process.cwd(), 'app', '(core)', 'dashboard', '(discovery)', 'discover', 'signal', 'ui.tsx'), 'utf8')

        expect(signalUi).toContain("growing: { bg: 'var(--color-blue-soft)', color: 'var(--color-blue)'")
        expect(signalUi).toContain("fading: { bg: 'var(--color-error-soft)', color: 'var(--color-error)'")
    })
})
