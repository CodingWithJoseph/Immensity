'use client'
import React, { Suspense, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { sendEmailVerification } from 'firebase/auth'
import Sidebar from '@/app/(core)/dashboard/components/Sidebar'
import { SidebarProvider } from '@/app/(core)/dashboard/contexts/SidebarContext'
import { WorkspaceProvider } from '@/app/(core)/dashboard/contexts/WorkspaceContext'
import { DashboardThemeProvider } from '@/components/ThemeContext'
import { fetchJson } from '@/lib/fetchJson'

function DashboardInner({ children }: { children: React.ReactNode }) {
    const [showBanner, setShowBanner] = useState(false)
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        const unsubscribe = auth.onIdTokenChanged(async user => {
            if (user) {
                try {
                    await user.reload()
                    const token = await user.getIdToken()
                    document.cookie = `firebase-token=${token}; path=/; max-age=3600; SameSite=Strict`
                    setShowBanner(!user.emailVerified)
                } catch (err) {
                    console.warn('Firebase auth refresh failed:', err)
                }
            } else {
                document.cookie = 'firebase-token=; path=/; max-age=0'
                setShowBanner(false)
            }
        })
        return () => unsubscribe()
    }, [])

    useEffect(() => {
        if (pathname === '/onboarding') return
        async function checkOnboarding() {
            const json = await fetchJson('/api/onboarding/status')
            if (json && !(json as { complete?: boolean }).complete) router.push('/onboarding')
        }
        void checkOnboarding()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleResend = async () => {
        const user = auth.currentUser
        if (user) await sendEmailVerification(user)
    }

    return (
        <div className='flex min-h-screen bg-(--shell-bg)'>
            <Suspense fallback={null}>
                <Sidebar />
            </Suspense>
            <div className='flex flex-1 flex-col pt-16 md:ml-56 md:mr-4'>
                {showBanner && (
                    <>
                        <div className='fixed left-0 right-0 top-16 z-50 flex items-center justify-between border-b border-(--color-border) bg-(--color-surface-raised) px-6 py-3 text-sm shadow-sm md:left-56 md:right-4'>
                            <p className='text-(--color-text)'>Please verify your email address to unlock all features.</p>
                            <div className='flex items-center gap-4'>
                                <button onClick={handleResend} className='font-medium text-(--color-link) transition-colors hover:text-(--color-link-hover)'>
                                    Resend email
                                </button>
                                <button onClick={() => setShowBanner(false)} className='text-(--color-text-muted) transition-colors hover:text-(--color-error)' aria-label='Dismiss verification banner'>x</button>
                            </div>
                        </div>
                        <div className='h-12 shrink-0' />
                    </>
                )}

                <main className='flex-1 overflow-hidden bg-(--color-bg) md:rounded-t-lg'>{children}</main>
            </div>
        </div>
    )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <DashboardThemeProvider>
            <SidebarProvider>
                <WorkspaceProvider>
                    <DashboardInner>{children}</DashboardInner>
                </WorkspaceProvider>
            </SidebarProvider>
        </DashboardThemeProvider>
    )
}
