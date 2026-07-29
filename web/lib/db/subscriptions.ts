const API_URL = process.env.NEXT_PUBLIC_API_URL

export type Plan = 'free' | 'pro' | 'elite' | 'admin'

export interface UserSubscription {
    uid: string
    plan: Plan
    stripeCustomerId: string | null
    stripeSubscriptionId: string | null
    stripePriceId: string | null
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
}

export async function getUserSubscription(uid: string, token: string): Promise<UserSubscription> {
    const res = await fetch(`${API_URL}/subscriptions/${uid}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    })

    if (!res.ok) {
        throw new Error('Failed to fetch subscription')
    }

    return res.json()
}

export function isPaidUser(plan: Plan): boolean {
    return plan === 'pro' || plan === 'elite'
}

export function isEliteUser(plan: Plan): boolean {
    return plan === 'elite'
}

export function isAdminUser(plan: Plan): boolean {
    return plan === 'admin'
}

export function isFreeUser(plan: Plan): boolean {
    return plan === 'free'
}