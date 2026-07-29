import fs from 'node:fs'
import path from 'node:path'

const css = fs.readFileSync(path.join(process.cwd(), 'app', 'globals.css'), 'utf8')
const root = css.slice(css.indexOf(':root {'), css.indexOf('.dark {'))
const dark = css.slice(css.indexOf('.dark {'), css.indexOf('.marketing {'))

describe('semantic color tokens', () => {
    it('defines the canonical light color roles', () => {
        expect(root).toContain('--color-blue:          #3E8EDE;')
        expect(root).toContain('--color-blue-soft:     #EAF2FC;')
        expect(root).toContain('--color-link-hover:    #2F75B9;')
        expect(root).toContain('--color-button-hover:  #000000;')
        expect(root).toContain('--color-on-button:     #FFFFFF;')
        expect(root).toContain('--color-warning:       #9A6700;')
        expect(root).toContain('--color-warning-soft:  #FFF8C5;')
        expect(root).toContain('--chip-info-bg:        #C8DEF8;')
        expect(root).toContain('--chip-info-text:      #0B437A;')
        expect(root).toContain('--chip-success-bg:     #B2E8CC;')
        expect(root).toContain('--chip-success-text:   #0D5535;')
        expect(root).toContain('--chip-warning-bg:     #EBC969;')
        expect(root).toContain('--chip-warning-text:   #664100;')
        expect(root).toContain('--chip-danger-bg:      #F5B9B2;')
        expect(root).toContain('--chip-danger-text:    #7D211A;')
    })

    it('defines a dark-mode mapping for every new role', () => {
        expect(dark).toContain('--color-blue:          #6CAEFF;')
        expect(dark).toContain('--color-blue-soft:     #102A46;')
        expect(dark).toContain('--color-link-hover:    #4C94E6;')
        expect(dark).toContain('--color-button-hover:  #000000;')
        expect(dark).toContain('--color-on-button:     #FFFFFF;')
        expect(dark).toContain('--color-warning:       #E3B341;')
        expect(dark).toContain('--color-warning-soft:  #3A2D0A;')
        expect(dark).toContain('--chip-info-bg:        #102A46;')
        expect(dark).toContain('--chip-success-bg:     #123425;')
        expect(dark).toContain('--chip-success-text:   #8DFFD0;')
        expect(dark).toContain('--chip-warning-bg:     #3A2D0A;')
        expect(dark).toContain('--chip-warning-text:   #FFD666;')
        expect(dark).toContain('--chip-danger-bg:      #3A1717;')
    })

    it('keeps score emphasis aligned with blue rather than orange', () => {
        expect(root).toContain('--score-strong: var(--color-blue);')
        expect(root).toContain('--score-strong-soft: var(--color-blue-soft);')
    })
})
