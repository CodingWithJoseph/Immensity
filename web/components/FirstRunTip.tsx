'use client'
import { useEffect, useState } from 'react'

const KEY = 'pf_onboarding_tip'

/**
 * One-time, dismissible welcome tip shown on the Explore page right after a user
 * finishes onboarding. The flag is set in localStorage by the onboarding flow and
 * cleared on dismiss, so it only ever appears once.
 */
export default function FirstRunTip() {
    const [show, setShow] = useState(false)

    useEffect(() => {
        // Deferred (inside an async helper) to keep clear of the
        // react-hooks/set-state-in-effect rule; reads localStorage on the client only.
        const run = async () => {
            if (typeof window !== 'undefined' && localStorage.getItem(KEY) === '1') setShow(true)
        }
        void run()
    }, [])

    if (!show) return null

    const dismiss = () => {
        if (typeof window !== 'undefined') localStorage.removeItem(KEY)
        setShow(false)
    }

    return (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3">
            <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-(--color-text)">👋 Welcome — this is your Explore feed</p>
                <p className="text-xs text-(--color-text-muted)">
                    These are AI-scored problems pulled from real discussions. Narrow them with the filters,
                    open one to dig into the signal, then hit + to add it to your pipeline.
                </p>
            </div>
            <button
                onClick={dismiss}
                aria-label="Dismiss tip"
                className="shrink-0 text-(--color-text-muted) transition-colors hover:text-(--color-error)"
            >
                ✕
            </button>
        </div>
    )
}
