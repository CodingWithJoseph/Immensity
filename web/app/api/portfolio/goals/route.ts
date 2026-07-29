import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { getToken, proxyJson } from '@/lib/apiProxy'

export async function GET(request: NextRequest) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error

    const token = getToken(request)
    return proxyJson('/portfolio/goals', {
        headers: { Authorization: `Bearer ${token}` },
    }, 'Failed to fetch portfolio goals')
}
