import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { getToken, proxyJson } from '@/lib/apiProxy'

function authorization(request: NextRequest) {
    return { Authorization: `Bearer ${getToken(request)}` }
}

export async function GET(request: NextRequest) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error

    const incoming = new URL(request.url)
    const params = new URLSearchParams()
    const view = incoming.searchParams.get('view')
    const limit = incoming.searchParams.get('limit')
    if (view) params.set('view', view)
    if (limit) params.set('limit', limit)
    const query = params.size ? `?${params.toString()}` : ''

    return proxyJson(
        `/clusters/search/sessions${query}`,
        { headers: authorization(request) },
        'Could not load search history',
    )
}

export async function POST(request: NextRequest) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'A valid JSON session request is required' }, { status: 400 })
    }

    return proxyJson(
        '/clusters/search/sessions',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authorization(request) },
            body: JSON.stringify(body),
        },
        'Could not start search history',
    )
}
