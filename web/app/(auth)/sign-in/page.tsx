'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { routes } from '@/app/util/routes'
import { useRouter } from 'next/navigation'
import { signIn } from "@/lib/services/auth"
import { getFirebaseErrorMessage } from "@/lib/firebase-errors"
import { validateSignInForm } from "@/lib/validation"
import toast from 'react-hot-toast'
import PasswordInput from "@/components/PasswordInput"
import Container from "@/components/Container";

export default function SignInPage() {
    const router = useRouter()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
    const [loading, setLoading] = useState(false)

    const handleSignIn = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault()

        const { valid, errors } = validateSignInForm({ email, password })
        setFieldErrors(errors)
        if (!valid) return

        setLoading(true)
        try {
            await signIn(email, password)
            toast.success('Welcome back!')
            // Honor ?redirect=… set by the proxy auth guard. Only allow
            // internal relative paths to avoid an open-redirect.
            const redirect = new URLSearchParams(window.location.search).get('redirect')
            const dest = redirect && redirect.startsWith('/') && !redirect.startsWith('//')
                ? redirect
                : routes.core.dashboard
            router.push(dest)
        } catch (err: unknown) {
            toast.error(getFirebaseErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="flex justify-center items-center min-h-screen bg-(--color-bg)">
            <Container className="flex justify-center">
                <div className="w-full max-w-md">
                    <h1 className="text-3xl font-bold text-(--color-text) mb-2">Sign In</h1>
                    <p className="text-(--color-text-muted) text-sm mb-8">
                        Don&#39;t have an account?{' '}
                        <Link href={routes.auth.signUp} className="text-(--color-text) font-medium hover:underline">
                            Sign Up
                        </Link>
                    </p>

                    <form onSubmit={handleSignIn} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-(--color-text)">Email</label>
                            <input
                                type="email"
                                value={email}
                                disabled={loading}
                                onChange={e => {
                                    setEmail(e.target.value)
                                    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }))
                                }}
                                placeholder="you@example.com"
                                className={`px-4 py-3 rounded-xl border bg-(--color-surface) text-(--color-text) text-sm focus:outline-none transition-colors disabled:opacity-50
                                ${fieldErrors.email
                                    ? 'border-(--color-error) focus:border-(--color-error)'
                                    : 'border-(--color-border) focus:border-(--color-text)'}`}
                            />
                            {fieldErrors.email && (
                                <p className="text-(--color-error) text-xs">{fieldErrors.email}</p>
                            )}
                        </div>

                        <PasswordInput
                            value={password}
                            onChangeAction={e => {
                                setPassword(e.target.value)
                                if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }))
                            }}
                            placeholder="Your password"
                            label="Password"
                            disabled={loading}
                        />
                        {fieldErrors.password && (
                            <p className="text-(--color-error) text-xs">{fieldErrors.password}</p>
                        )}

                        <Link href={routes.auth.forgotPassword} className="text-sm text-(--color-text-muted) hover:text-(--color-text) transition-colors">
                            Forgot password?
                        </Link>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-2 rounded-full bg-(--color-button) px-6 py-3 text-sm font-semibold text-(--color-on-button) transition-colors hover:bg-(--color-button-hover) disabled:opacity-50">
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </form>

                    <p className="text-xs text-(--color-text-muted) mt-6 text-center">
                        By creating an account you agree to our{' '}
                        <Link href={routes.misc.terms} className="underline">Terms</Link>
                        {' '}and{' '}
                        <Link href={routes.misc.privacy} className="underline">Privacy Policy</Link>
                    </p>
                </div>
            </Container>
        </main>
    )
}
