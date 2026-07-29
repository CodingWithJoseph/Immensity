'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { routes } from '@/app/util/routes'

export default function PaymentSuccessPage() {
    const router = useRouter()
    const [countdown, setCountdown] = useState(3)

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    router.push(routes.core.settings)
                }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(timer)
    }, [router])

    return (
        <div className="min-h-screen flex items-center justify-center bg-(--color-bg)">
            <div className="max-w-md w-full mx-auto px-8 py-12 bg-(--color-surface) rounded-3xl border border-(--color-border) flex flex-col items-center gap-6 text-center">
                <div className="w-16 h-16 rounded-full bg-(--color-bg) flex items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-(--color-text)">
                        <path d="M20 6L9 17l-5-5"/>
                    </svg>
                </div>
                <div>
                    <h1 className="text-2xl font-semibold text-(--color-text)">You&#39;re upgraded!</h1>
                    <p className="text-sm text-(--color-text-muted) mt-2">
                        Your plan has been updated. All features are now unlocked.
                    </p>
                </div>
                <p className="text-xs text-(--color-text-muted)">
                    Redirecting to settings in {countdown}s...
                </p>
                <Link
                    href={routes.core.settings}
                    className="rounded-xl bg-(--color-button) px-6 py-2.5 text-sm font-medium text-(--color-on-button) transition-colors hover:bg-(--color-button-hover)">
                    Go to settings
                </Link>
            </div>
        </div>
    )
}
