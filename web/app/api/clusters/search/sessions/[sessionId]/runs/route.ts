import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { getToken, proxyJson } from '@/lib/apiProxy'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> },
) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'A valid JSON search run is required' }, { status: 400 })
    }

    const { sessionId } = await params
    return proxyJson(
        `/clusters/search/sessions/${encodeURIComponent(sessionId)}/runs`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${getToken(request)}`,
            },
            body: JSON.stringify(body),
        },
        'Could not save this search run',
    )
}
