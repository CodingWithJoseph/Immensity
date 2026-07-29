import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'

const API_URL = process.env.NEXT_PUBLIC_API_URL

function getToken(request: NextRequest): string | undefined {
    return request.headers.get('Authorization')?.replace('Bearer ', '')
        ?? request.cookies.get('firebase-token')?.value
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ clusterId: string }> },
) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error

    const { clusterId } = await params
    const token = getToken(request)

    const res = await fetch(`${API_URL}/pipeline/watch/${clusterId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    })

    let json: unknown = { error: 'Failed to unwatch cluster' }
    try {
        const text = await res.text()
        if (text) json = JSON.parse(text)
    } catch {
        // keep fallback
    }
    return NextResponse.json(json, { status: res.status })
}
