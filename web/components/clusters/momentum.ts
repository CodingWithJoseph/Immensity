/**
 * Shared momentum + recency helpers for cluster cards and the cluster detail
 * panel. Kept in one place so the card and the panel render the same labels.
 */

export const INK = 'var(--color-text)'

export type Momentum = { label: string; color: string; muted: boolean } | null

// Momentum is derived from the cluster's `trending` flag (the simplified schema
// no longer carries growth-rate columns).
export function momentumFor(trending: boolean | null | undefined): Momentum {
    if (trending === null || trending === undefined) return null
    if (trending) return { label: 'Trending', color: INK, muted: false }
    return { label: 'Steady', color: 'var(--color-text-muted)', muted: false }
}

export function lastSeen(lastSeenDate: string | null | undefined): string | null {
    if (!lastSeenDate) return null
    const end = new Date(lastSeenDate)
    if (Number.isNaN(end.getTime())) return null
    const days = Math.floor((Date.now() - end.getTime()) / 86_400_000)
    if (days <= 0) return 'Last seen today'
    if (days === 1) return 'Last seen 1 day ago'
    return `Last seen ${days} days ago`
}
