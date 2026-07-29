import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { forwardJson, getToken } from '@/lib/apiProxy'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> },
) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error

    const { token } = await params
    const authToken = getToken(request)
    const res = await fetch(`${API_URL}/invites/${token}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
    })
    return forwardJson(res, 'Failed to accept invite')
}
