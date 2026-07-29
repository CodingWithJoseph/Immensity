// Maps a 0–100 opportunity score to brand "grade" tones (token classes only).
export function scoreTone(score: number): { text: string; bg: string; ring: string } {
    if (score >= 80) {
        return { text: 'text-(--score-strong)', bg: 'bg-(--score-strong-soft)', ring: 'var(--score-strong)' }
    }
    if (score >= 60) {
        return { text: 'text-(--accent)', bg: 'bg-(--accent-soft)', ring: 'var(--accent)' }
    }
    return { text: 'text-(--score-medium)', bg: 'bg-(--score-medium-soft)', ring: 'var(--score-medium)' }
}

// Compact volume formatting, e.g. 4120 -> "4.1K".
export function compactCount(value: number): string {
    return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: value >= 10_000 ? 0 : 1,
    })
        .format(value)
        .toUpperCase()
}

// Human "updated X ago" from an ISO timestamp.
export function relativeTime(iso: string): string {
    const then = new Date(iso).getTime()
    if (Number.isNaN(then)) return 'recently'
    const diffMs = Date.now() - then
    const mins = Math.round(diffMs / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
    const hours = Math.round(mins / 60)
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
    const days = Math.round(hours / 24)
    return `${days} day${days === 1 ? '' : 's'} ago`
}
