import fs from 'node:fs'
import path from 'node:path'
import { render } from '@testing-library/react'
import FeatureContextDot, { type FeatureCategory } from '@/app/(core)/dashboard/components/FeatureContextDot'

const categories: Array<[FeatureCategory, string]> = [
    ['manage', 'bg-(--color-feat-manage)'],
    ['build', 'bg-(--color-feat-build)'],
    ['monitor', 'bg-(--color-feat-monitor)'],
    ['market', 'bg-(--color-feat-market)'],
]

describe('FeatureContextDot', () => {
    it.each(categories)('renders an 8px %s category dot', (category, colorClass) => {
        const { container } = render(<FeatureContextDot category={category} />)
        const dot = container.firstElementChild

        expect(dot).toHaveAttribute('aria-hidden', 'true')
        expect(dot).toHaveAttribute('data-feature-category', category)
        expect(dot).toHaveClass('h-2', 'w-2', 'shrink-0', 'rounded-full', colorClass)
    })

    it('keeps feature dots out of the top navigation', () => {
        const sidebar = fs.readFileSync(
            path.join(process.cwd(), 'app', '(core)', 'dashboard', 'components', 'Sidebar.tsx'),
            'utf8',
        )

        expect(sidebar).not.toContain('<FeatureContextDot')
        expect(sidebar).toContain('type FeatureCategory')
    })

    it('keeps the category palette centralized in globals.css', () => {
        const globals = fs.readFileSync(path.join(process.cwd(), 'app', 'globals.css'), 'utf8')

        expect(globals).toContain('/* ---- Feature Categories ---- */')
        expect(globals).toContain('--color-feat-manage:   #5293BB;')
        expect(globals).toContain('--color-feat-build:    #3776A1;')
        expect(globals).toContain('--color-feat-monitor:  #1B5886;')
        expect(globals).toContain('--color-feat-market:   #003A6B;')
    })
})
