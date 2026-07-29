'use client'
import { useEffect } from 'react'

// Error boundary for the whole dashboard (home + discovery/build/
// manage sub-routes). The dashboard layout (sidebar) stays mounted, so a crash
// here recovers in the content area instead of blanking the page.
export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('[DashboardError]', error)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
            <h2 className="text-2xl font-semibold text-(--color-text) mb-2">Something went wrong</h2>
            <p className="text-sm text-(--color-text-muted) mb-6 max-w-sm">
                This section failed to load. You can retry without leaving the dashboard.
            </p>
            <button
                onClick={reset}
                className="rounded-xl bg-(--color-button) px-5 py-2.5 text-sm font-medium text-(--color-on-button) transition-colors hover:bg-(--color-button-hover)"
            >
                Try again
            </button>
        </div>
    )
}
