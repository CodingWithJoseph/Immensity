import { NextRequest, NextResponse } from 'next/server'

const LOCAL_BACKEND_URL = 'http://127.0.0.1:8000'

function getBackendUrl(path: string): URL | null {
    const configuredUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL
    const baseUrl = configuredUrl || (process.env.NODE_ENV === 'development' ? LOCAL_BACKEND_URL : undefined)

    if (!baseUrl) return null

    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
    return new URL(path.replace(/^\//, ''), normalizedBaseUrl)
}

/**
 * Extract the bearer token from the Authorization header, falling back to the
 * `firebase-token` cookie (set by the client on id-token change). Routes that
 * read the header alone forward `Bearer undefined` when the caller authed via
 * the cookie.
 */
export function getToken(request: NextRequest): string | undefined {
    return request.headers.get('Authorization')?.replace('Bearer ', '')
        ?? request.cookies.get('firebase-token')?.value
}

/**
 * Forward a backend `Response` as JSON, preserving its status code and
 * tolerating an empty / non-JSON body. Calling `res.json()` directly throws a
 * 500 when the backend returns 204/empty or an HTML error page.
 */
export async function forwardJson(res: Response, fallbackError = 'Request failed'): Promise<NextResponse> {
    const text = await res.text()
    if (!text) {
        return NextResponse.json(res.ok ? {} : { error: fallbackError }, { status: res.status })
    }
    try {
        return NextResponse.json(JSON.parse(text), { status: res.status })
    } catch {
        // Non-JSON body (e.g. a gateway HTML error). Don't crash the route.
        return NextResponse.json(res.ok ? {} : { error: fallbackError }, { status: res.status })
    }
}

/**
 * Call the backend and forward its JSON response without letting a missing URL
 * or unavailable local API turn into an opaque Next.js 500 response.
 */
export async function proxyJson(
    path: string,
    init: RequestInit = {},
    fallbackError = 'Request failed',
): Promise<NextResponse> {
    let url: URL | null
    try {
        url = getBackendUrl(path)
    } catch (error) {
        console.error('[backend-proxy] API_URL or NEXT_PUBLIC_API_URL is invalid', error)
        return NextResponse.json(
            { error: 'Backend API configuration is invalid', code: 'BACKEND_CONFIG_INVALID' },
            { status: 503 },
        )
    }

    if (!url) {
        console.error('[backend-proxy] API_URL or NEXT_PUBLIC_API_URL is not configured')
        return NextResponse.json(
            { error: 'Backend API is not configured', code: 'BACKEND_NOT_CONFIGURED' },
            { status: 503 },
        )
    }

    try {
        return forwardJson(await fetch(url, init), fallbackError)
    } catch (error) {
        console.error(`[backend-proxy] ${url.origin} is unavailable`, error)
        return NextResponse.json(
            { error: 'Backend API is unavailable', code: 'BACKEND_UNAVAILABLE' },
            { status: 503 },
        )
    }
}
