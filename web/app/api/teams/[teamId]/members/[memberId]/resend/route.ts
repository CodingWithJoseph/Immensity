import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { forwardJson, getToken } from '@/lib/apiProxy'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ teamId: string; memberId: string }> },
) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error

    const { teamId, memberId } = await params
    const token = getToken(request)
    const res = await fetch(`${API_URL}/teams/${teamId}/members/${memberId}/resend`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    })
    return forwardJson(res, 'Failed to resend invite')
}
