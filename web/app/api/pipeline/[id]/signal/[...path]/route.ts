import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { getToken, proxyJson } from '@/lib/apiProxy'

const ALLOWED_ROOTS = new Set(['case', 'conversations'])

async function forward(
    request: NextRequest,
    params: Promise<{ id: string; path: string[] }>,
) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error

    const { id, path } = await params
    if (
        path.length === 0
        || !ALLOWED_ROOTS.has(path[0])
        || path.some(segment => !segment || segment === '.' || segment === '..')
    ) {
        return Response.json({ error: 'Unsupported Signal API path' }, { status: 404 })
    }

    const token = getToken(request)
    const suffix = path.map(segment => encodeURIComponent(segment)).join('/')
    const query = request.nextUrl.search
    const hasBody = request.method !== 'GET' && request.method !== 'HEAD'
    return proxyJson(
        `/pipeline/${encodeURIComponent(id)}/signal/${suffix}${query}`,
        {
            method: request.method,
            headers: {
                Authorization: `Bearer ${token}`,
                ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
            },
            body: hasBody ? await request.text() : undefined,
        },
        'Signal request failed',
    )
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; path: string[] }> },
) {
    return forward(request, params)
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; path: string[] }> },
) {
    return forward(request, params)
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; path: string[] }> },
) {
    return forward(request, params)
}

