import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { useDialogFocus } from '@/app/(core)/dashboard/hooks/useDialogFocus'

function Dialog({ onClose }: { onClose: () => void }) {
    const ref = useDialogFocus<HTMLDivElement>()
    return (
        <div ref={ref} role="dialog" aria-modal="true" tabIndex={-1} aria-label="Test dialog">
            <button onClick={onClose}>First</button>
            <button>Middle</button>
            <button>Last</button>
        </div>
    )
}

function Harness() {
    const [open, setOpen] = useState(false)
    return (
        <>
            <button onClick={() => setOpen(true)}>Open</button>
            {open && <Dialog onClose={() => setOpen(false)} />}
        </>
    )
}

describe('useDialogFocus', () => {
    it('moves focus into the dialog on open', () => {
        render(<Harness />)
        screen.getByText('Open').focus()
        fireEvent.click(screen.getByText('Open'))
        expect(document.activeElement).toBe(screen.getByText('First'))
    })

    it('traps Tab: wraps from the last focusable back to the first', () => {
        render(<Harness />)
        fireEvent.click(screen.getByText('Open'))
        const dialog = screen.getByRole('dialog')
        const last = screen.getByText('Last')
        last.focus()
        fireEvent.keyDown(dialog, { key: 'Tab' })
        expect(document.activeElement).toBe(screen.getByText('First'))
    })

    it('traps Shift+Tab: wraps from the first focusable to the last', () => {
        render(<Harness />)
        fireEvent.click(screen.getByText('Open'))
        const dialog = screen.getByRole('dialog')
        screen.getByText('First').focus()
        fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
        expect(document.activeElement).toBe(screen.getByText('Last'))
    })

    it('returns focus to the trigger when the dialog closes', () => {
        render(<Harness />)
        const opener = screen.getByText('Open')
        opener.focus()
        fireEvent.click(opener)
        fireEvent.click(screen.getByText('First')) // closes the dialog
        expect(document.activeElement).toBe(opener)
    })
})
