import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { fetchJson } from '@/lib/fetchJson'
import type { Plan } from '@/lib/db/subscriptions'

// Module-level cache so multiple gated components share a single plan fetch.
// Keyed by uid so a different user signing in on the same tab never inherits
// the previous user's plan.
let cachedPlan: Plan | null = null
let cachedUid: string | null = null

/** Invalidate the shared plan cache (call on sign-out or after a plan change). */
export function clearCachedPlan(): void {
    cachedPlan = null
    cachedUid = null
}

/**
 * Client hook exposing the current user's plan, used to gate Pro/Elite features
 * in the UI. Enforcement is server-side; this only drives presentation.
 */
export function usePlan(): { plan: Plan | null; loading: boolean } {
    const { user, authReady } = useAuth()
    const initial = user && cachedUid === user.uid ? cachedPlan : null
    const [plan, setPlan] = useState<Plan | null>(initial)
    const [loading, setLoading] = useState(!initial)

    useEffect(() => {
        if (!authReady || !user) return
        let cancelled = false
        const run = async () => {
            // Serve from cache only when it belongs to the current user.
            if (cachedPlan && cachedUid === user.uid) {
                if (cancelled) return
                setPlan(cachedPlan)
                setLoading(false)
                return
            }
            setLoading(true)
            const token = await user.getIdToken()
            const json = await fetchJson<{ plan: Plan }>('/api/account/plan', {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (cancelled) return
            if (json?.plan) {
                cachedPlan = json.plan
                cachedUid = user.uid
                setPlan(json.plan)
            }
            setLoading(false)
        }
        void run()
        return () => {
            cancelled = true
        }
    }, [authReady, user])

    return { plan, loading }
}
