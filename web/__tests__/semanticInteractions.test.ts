import fs from 'node:fs'
import path from 'node:path'

function sourceFiles(directory: string): string[] {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const target = path.join(directory, entry.name)
        if (entry.isDirectory()) return sourceFiles(target)
        return entry.name.endsWith('.tsx') ? [target] : []
    })
}

const files = [
    ...sourceFiles(path.join(process.cwd(), 'app')),
    ...sourceFiles(path.join(process.cwd(), 'components')),
]

describe('semantic interaction colors', () => {
    it('does not use orange accent tokens for interactive hover text', () => {
        const offenders = files.filter(file => {
            const source = fs.readFileSync(file, 'utf8')
            return /text-\(--color-accent\)[^\n]*hover|hover:text-\(--color-accent/.test(source)
        })

        expect(offenders).toEqual([])
    })

    it('does not use brand orange as an interactive hover surface', () => {
        const offenders = files.filter(file => {
            const source = fs.readFileSync(file, 'utf8')
            return /bg-\(--accent\)[^\n]*hover:bg-\(--accent|text-\(--accent\)[^\n]*hover:/.test(source)
        })

        expect(offenders).toEqual([])
    })

    it('does not dim charcoal buttons as their hover treatment', () => {
        const offenders = files.filter(file => {
            const source = fs.readFileSync(file, 'utf8')
            return /bg-\(--color-text\)[^\n]*\shover:opacity/.test(source)
        })

        expect(offenders).toEqual([])
    })
})
