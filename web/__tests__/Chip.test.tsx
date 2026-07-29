import { render, screen } from '@testing-library/react'
import Chip from '@/app/(core)/dashboard/components/Chip'
import StatusChip from '@/app/(core)/dashboard/components/StatusChip'

describe('Chip tones', () => {
    it('defaults to neutral and never infers tone from label text', () => {
        render(<Chip label="warning" />)

        expect(screen.getByText('warning').parentElement).toHaveClass('bg-(--color-bg)', 'text-(--color-text-muted)')
    })

    it('applies an explicitly requested semantic tone', () => {
        render(<Chip label="Open" tone="warning" />)

        expect(screen.getByText('Open').parentElement).toHaveClass('bg-(--color-warning-soft)', 'text-(--color-warning)')
    })

    it('uses a borderless fill and tone-specific readable text when requested', () => {
        render(<Chip label="Open" tone="warning" appearance="filled" />)

        expect(screen.getByText('Open').parentElement).toHaveClass('border-0', 'bg-[var(--chip-warning-bg)]', 'text-[var(--chip-warning-text)]', 'font-bold', 'leading-normal')
    })

    it('keeps shared status chips neutral unless a consumer opts into semantics', () => {
        const { rerender } = render(<StatusChip status="watching" />)

        expect(screen.getByText('Watching').parentElement).toHaveClass('bg-(--color-bg)')

        rerender(<StatusChip status="watching" semantic />)

        expect(screen.getByText('Watching').parentElement).toHaveClass('border-0', 'bg-[var(--chip-info-bg)]', 'text-[var(--chip-info-text)]')
    })
})
