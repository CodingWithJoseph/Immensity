import { render, screen } from '@testing-library/react'
import ProgressBar, { ProgressRow } from '@/app/(core)/dashboard/components/ProgressBar'

describe('ProgressBar', () => {
    it('renders a flat blue process fill sized to the percent', () => {
        const { container } = render(<ProgressBar value={3} max={10} tone='process' />)
        const fill = container.querySelector('.pf-bar-fill') as HTMLElement
        expect(fill.style.width).toBe('30%')
        expect(fill).toHaveClass('bg-(--color-blue)')
    })

    it('keeps the success tone green and clamps overflow', () => {
        const { container } = render(<ProgressBar value={50} max={10} tone='success' />)
        const fill = container.querySelector('.pf-bar-fill') as HTMLElement
        expect(fill.style.width).toBe('100%') // clamped
        expect(fill).toHaveClass('bg-(--color-success)')
    })

    it('applies the rounded override to track and fill', () => {
        const { container } = render(<ProgressBar value={4} max={8} rounded='rounded-b-md' size='xs' />)
        const fill = container.querySelector('.pf-bar-fill') as HTMLElement
        expect(fill).toHaveClass('rounded-b-md')
        expect(fill).not.toHaveClass('rounded-full')
    })

    it('lets fillClassName override the colour (e.g. pipeline phase)', () => {
        const { container } = render(<ProgressBar value={4} max={8} fillClassName='bg-(--color-warning)' />)
        const fill = container.querySelector('.pf-bar-fill') as HTMLElement
        expect(fill).toHaveClass('bg-(--color-warning)')
        expect(fill).not.toHaveClass('bg-(--color-blue)')
    })
})

describe('ProgressRow', () => {
    it('renders title | bar | "X / Y" on one line (slash format)', () => {
        const { container } = render(<ProgressRow title='Tasks verified' current={2} target={5} format='slash' />)
        expect(screen.getByText('Tasks verified')).toBeInTheDocument()
        expect(screen.getByText('2 / 5')).toBeInTheDocument()
        expect(container.querySelector('.pf-bar-fill')).toBeInTheDocument()
    })

    it('supports the "X of Y" format and a value formatter', () => {
        render(<ProgressRow title='Revenue' current={5000} target={10000} format='of' formatValue={n => `$${n / 100}`} />)
        expect(screen.getByText('$50 of $100')).toBeInTheDocument()
    })

    it('honours a label override and a custom bar slot', () => {
        const { container } = render(
            <ProgressRow title='Setup' current={4} target={4} label='Complete' bar={<div data-testid='custom-bar' />} />,
        )
        expect(screen.getByText('Complete')).toBeInTheDocument()
        expect(screen.getByTestId('custom-bar')).toBeInTheDocument()
        // Custom bar replaces the default ProgressBar.
        expect(container.querySelector('.pf-bar-fill')).not.toBeInTheDocument()
    })
})
