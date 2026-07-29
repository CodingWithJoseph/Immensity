import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { getToken, proxyJson } from '@/lib/apiProxy'

export async function GET(request: NextRequest) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error

    return proxyJson(
        '/clusters/search/options',
        { headers: { Authorization: `Bearer ${getToken(request)}` } },
        'Could not load search filter options',
    )
}
