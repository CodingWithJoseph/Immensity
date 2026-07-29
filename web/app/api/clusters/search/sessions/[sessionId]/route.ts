import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { getToken, proxyJson } from '@/lib/apiProxy'

type RouteContext = { params: Promise<{ sessionId: string }> }

function authorization(request: NextRequest) {
    return { Authorization: `Bearer ${getToken(request)}` }
}

async function sessionPath(context: RouteContext): Promise<string> {
    const { sessionId } = await context.params
    return `/clusters/search/sessions/${encodeURIComponent(sessionId)}`
}

export async function GET(request: NextRequest, context: RouteContext) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error

    return proxyJson(
        await sessionPath(context),
        { headers: authorization(request) },
        'Could not load this search',
    )
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'A valid JSON session update is required' }, { status: 400 })
    }

    return proxyJson(
        await sessionPath(context),
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...authorization(request) },
            body: JSON.stringify(body),
        },
        'Could not update this search',
    )
}

export async function DELETE(request: NextRequest, context: RouteContext) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error

    return proxyJson(
        await sessionPath(context),
        { method: 'DELETE', headers: authorization(request) },
        'Could not delete this search',
    )
}
