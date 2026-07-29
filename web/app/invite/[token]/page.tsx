'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { routes } from '@/app/util/routes'
import Container from '@/components/Container'

interface InvitePreview {
    token: string
    teamId: string
    teamName: string
    teamDescription: string | null
    email: string | null
    role: 'owner' | 'admin' | 'member'
    status: 'active' | 'invited' | 'removed'
    expiresAt: string | null
    expired: boolean
}

type LoadState =
    | { kind: 'loading' }
    | { kind: 'error'; message: string }
    | { kind: 'ready'; invite: InvitePreview }

export default function InviteAcceptPage() {
    const params = useParams<{ token: string }>()
    const token = params?.token
    const router = useRouter()
    const { user, authReady } = useAuth()

    const [state, setState] = useState<LoadState>({ kind: 'loading' })
    const [accepting, setAccepting] = useState(false)
    const [actionError, setActionError] = useState<string | null>(null)

    useEffect(() => {
        if (!token) return
        let cancelled = false
        ;(async () => {
            try {
                const res = await fetch(`/api/invites/${token}`)
                if (res.status === 404) {
                    if (!cancelled) setState({ kind: 'error', message: 'This invite link is invalid or has been revoked.' })
                    return
                }
                const body = await res.json()
                if (!res.ok) {
                    if (!cancelled) setState({ kind: 'error', message: body?.error || 'Could not load this invite.' })
                    return
                }
                if (!cancelled) setState({ kind: 'ready', invite: body.data as InvitePreview })
            } catch {
                if (!cancelled) setState({ kind: 'error', message: 'Could not load this invite.' })
            }
        })()
        return () => {
            cancelled = true
        }
    }, [token])

    const acceptInvite = useCallback(async () => {
        if (!token) return
        setAccepting(true)
        setActionError(null)
        try {
            const res = await fetch(`/api/invites/${token}/accept`, { method: 'POST' })
            const body = await res.json().catch(() => ({}))
            if (res.ok) {
                router.push(routes.core.teams)
                return
            }
            if (res.status === 409) {
                // Already accepted — treat as success and move on.
                router.push(routes.core.teams)
                return
            }
            setActionError(body?.error || body?.detail || 'Could not accept this invite.')
        } catch {
            setActionError('Could not accept this invite.')
        } finally {
            setAccepting(false)
        }
    }, [token, router])

    return (
        <main className="flex min-h-screen items-center justify-center bg-(--color-bg)">
            <Container className="flex justify-center">
                <div className="w-full max-w-md rounded-xl border border-(--color-border) bg-(--color-surface) p-8">
                    {state.kind === 'loading' && (
                        <p className="text-sm text-(--color-text-muted)">Loading invitation…</p>
                    )}

                    {state.kind === 'error' && (
                        <>
                            <h1 className="mb-2 text-2xl font-bold text-(--color-text)">Invitation unavailable</h1>
                            <p className="mb-6 text-sm text-(--color-text-muted)">{state.message}</p>
                            <Link href={routes.core.dashboard} className="text-sm font-medium text-(--color-text) hover:underline">
                                Go to dashboard
                            </Link>
                        </>
                    )}

                    {state.kind === 'ready' && <ReadyView
                        invite={state.invite}
                        token={token!}
                        authReady={authReady}
                        signedIn={!!user}
                        accepting={accepting}
                        actionError={actionError}
                        onAccept={acceptInvite}
                    />}
                </div>
            </Container>
        </main>
    )
}

function ReadyView({
    invite, token, authReady, signedIn, accepting, actionError, onAccept,
}: {
    invite: InvitePreview
    token: string
    authReady: boolean
    signedIn: boolean
    accepting: boolean
    actionError: string | null
    onAccept: () => void
}) {
    if (invite.status === 'active') {
        return (
            <>
                <h1 className="mb-2 text-2xl font-bold text-(--color-text)">Already a member</h1>
                <p className="mb-6 text-sm text-(--color-text-muted)">
                    This invitation to <strong>{invite.teamName}</strong> has already been accepted.
                </p>
                <Link href={routes.core.teams} className="text-sm font-medium text-(--color-text) hover:underline">
                    Go to teams
                </Link>
            </>
        )
    }

    if (invite.expired) {
        return (
            <>
                <h1 className="mb-2 text-2xl font-bold text-(--color-text)">Invitation expired</h1>
                <p className="mb-6 text-sm text-(--color-text-muted)">
                    This invitation to <strong>{invite.teamName}</strong> has expired. Ask a team admin to send a new one.
                </p>
                <Link href={routes.core.dashboard} className="text-sm font-medium text-(--color-text) hover:underline">
                    Go to dashboard
                </Link>
            </>
        )
    }

    const redirectTo = encodeURIComponent(`/invite/${token}`)

    return (
        <>
            <h1 className="mb-2 text-2xl font-bold text-(--color-text)">You&apos;re invited</h1>
            <p className="mb-6 text-sm text-(--color-text-muted)">
                You&apos;ve been invited to join <strong>{invite.teamName}</strong> as {invite.role}
                {invite.email ? <> ({invite.email})</> : null}.
            </p>

            {!authReady ? (
                <p className="text-sm text-(--color-text-muted)">Checking your session…</p>
            ) : signedIn ? (
                <>
                    <button
                        type="button"
                        onClick={onAccept}
                        disabled={accepting}
                        className="w-full rounded-md bg-(--color-button) px-4 py-2 text-sm font-medium text-(--color-on-button) transition-colors hover:bg-(--color-button-hover) disabled:opacity-40"
                    >
                        {accepting ? 'Accepting…' : 'Accept invitation'}
                    </button>
                    {actionError && <p className="mt-3 text-sm text-(--color-error)">{actionError}</p>}
                </>
            ) : (
                <div className="flex flex-col gap-3">
                    <p className="text-sm text-(--color-text-muted)">Sign in to accept this invitation.</p>
                    <Link
                        href={`${routes.auth.signIn}?redirect=${redirectTo}`}
                        className="w-full rounded-md bg-(--color-button) px-4 py-2 text-center text-sm font-medium text-(--color-on-button) transition-colors hover:bg-(--color-button-hover)"
                    >
                        Sign in
                    </Link>
                    <Link
                        href={`${routes.auth.signUp}?redirect=${redirectTo}`}
                        className="w-full rounded-md border border-(--color-border) px-4 py-2 text-center text-sm font-medium text-(--color-text) transition-opacity hover:opacity-80"
                    >
                        Create an account
                    </Link>
                </div>
            )}
        </>
    )
}
