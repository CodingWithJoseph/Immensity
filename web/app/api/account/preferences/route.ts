import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { getToken, proxyJson } from '@/lib/apiProxy'

export async function GET(request: NextRequest) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error
    const token = getToken(request)
    return proxyJson('/preferences', {
        headers: { Authorization: `Bearer ${token}` },
    }, 'Failed to load preferences')
}

export async function PUT(request: NextRequest) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error
    const token = getToken(request)
    const body = await request.text()
    return proxyJson('/preferences', {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body,
    }, 'Failed to save preferences')
}
