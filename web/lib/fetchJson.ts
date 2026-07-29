/**
 * Safe fetch utilities — prevents "Unexpected end of JSON input" crashes.
 *
 * fetchJson: fires a fetch and returns parsed JSON (or null on error/empty)
 * safeJson:  parses a Response you already have (e.g. from authFetch)
 */

/** Standard envelope for our JSON API responses: `{ data: ... }`. */
export type ApiData<T> = { data: T }

export async function fetchJson<T = Record<string, unknown>>(
    input: RequestInfo | URL,
    init?: RequestInit,
): Promise<T | null> {
    try {
        const res = await fetch(input, init)
        if (!res.ok) {
            if (res.status !== 404) {
                console.error(`fetchJson: ${String(input)} returned ${res.status}`)
            }
            return null
        }
        const text = await res.text()
        if (!text) return null
        return JSON.parse(text) as T
    } catch (err) {
        console.error(`fetchJson: failed to fetch ${String(input)}`, err)
        return null
    }
}

export async function safeJson<T = Record<string, unknown>>(
    res: Response,
): Promise<T | null> {
    try {
        const text = await res.text()
        if (!text) return null
        return JSON.parse(text) as T
    } catch (err) {
        console.error('safeJson: failed to parse response', err)
        return null
    }
}