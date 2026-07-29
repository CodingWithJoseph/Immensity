import { render, screen } from '@testing-library/react'

import NavigationBar from '@/components/NavigationBar'

describe('NavigationBar', () => {
    it('keeps Sign In on the current app outside production', () => {
        render(<NavigationBar />)

        expect(screen.getAllByRole('link', { name: 'Sign In' })[0])
            .toHaveAttribute('href', '/sign-in')
    })
})
