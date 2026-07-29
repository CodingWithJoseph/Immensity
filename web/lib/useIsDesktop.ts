import { useEffect, useState } from 'react'

// Tailwind's `lg` breakpoint. Kept in sync with the master-detail layouts that
// split into a persistent two-pane view at `lg` (e.g. the Teams page).
const DESKTOP_QUERY = '(min-width: 1024px)'

/**
 * Client hook reporting whether the viewport is at or above the `lg` breakpoint.
 * Used to mount a persistent detail pane on desktop vs. an overlay drawer on
 * smaller screens, so only one instance renders (and fetches) at a time.
 *
 * Returns `false` during SSR / first paint, then corrects on mount. Components
 * that must not flash the wrong layout should treat the pre-mount value as
 * "not yet known" if needed.
 */
export function useIsDesktop(): boolean {
    const [isDesktop, setIsDesktop] = useState(false)

    useEffect(() => {
        const media = window.matchMedia(DESKTOP_QUERY)
        const update = () => setIsDesktop(media.matches)
        update()
        media.addEventListener('change', update)
        return () => media.removeEventListener('change', update)
    }, [])

    return isDesktop
}
