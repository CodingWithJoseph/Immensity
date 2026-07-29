import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { getToken, proxyJson } from '@/lib/apiProxy'

export async function GET(request: NextRequest) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error

    const token = getToken(request)
    const { searchParams } = new URL(request.url)
    const query = searchParams.toString()

    return proxyJson(`/dashboard/activity${query ? `?${query}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
    }, 'Failed to fetch dashboard activity')
}

export async function POST(request: NextRequest) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error

    const token = getToken(request)
    return proxyJson('/dashboard/activity', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(await request.json()),
    }, 'Failed to record dashboard activity')
}
