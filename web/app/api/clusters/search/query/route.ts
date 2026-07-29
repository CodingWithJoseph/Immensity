import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { getToken, proxyJson } from '@/lib/apiProxy'

export async function POST(request: NextRequest) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'A valid JSON search draft is required' }, { status: 400 })
    }

    return proxyJson(
        '/clusters/search/query',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${getToken(request)}`,
            },
            body: JSON.stringify(body),
        },
        'Could not run the confirmed search',
    )
}
