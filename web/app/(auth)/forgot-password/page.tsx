'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { routes } from '@/app/util/routes'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import toast from "react-hot-toast";
import { getFirebaseErrorMessage } from "@/lib/firebase-errors";
import Container from "@/components/Container";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)

    const handleReset = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)

        try {
            await sendPasswordResetEmail(auth, email)
            setSent(true)
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
                    {sent ? (
                        <div className="flex flex-col gap-4">
                            <h1 className="text-3xl font-bold text-(--color-text)">Check your email</h1>
                            <p className="text-(--color-text-muted) text-sm">
                                We sent a password reset link to <strong>{email}</strong>. Check your inbox and follow the instructions.
                            </p>
                            <Link href={routes.auth.signIn} className="text-sm text-(--color-text) font-medium hover:underline">
                                ← Back to sign in
                            </Link>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-3xl font-bold text-(--color-text) mb-2">Reset password</h1>
                            <p className="text-(--color-text-muted) text-sm mb-8">
                                Enter your email and we&#39;ll send you a reset link.
                            </p>

                            <form onSubmit={handleReset} className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-(--color-text)">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        required
                                        className="px-4 py-3 rounded-xl border border-(--color-border) bg-(--color-surface) text-(--color-text) text-sm focus:outline-none focus:border-(--color-text) transition-colors"/>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="mt-2 rounded-full bg-(--color-button) px-6 py-3 text-sm font-semibold text-(--color-on-button) transition-colors hover:bg-(--color-button-hover) disabled:opacity-50">
                                    {loading ? 'Sending...' : 'Send reset link'}
                                </button>
                            </form>

                            <Link href={routes.auth.signIn} className="block text-sm text-(--color-text-muted) mt-6 hover:text-(--color-text) transition-colors">
                                ← Back to sign in
                            </Link>
                        </>
                    )}
                </div>
            </Container>
        </main>
    )
}
