import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { forwardJson, getToken } from '@/lib/apiProxy'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ teamId: string; memberId: string }> },
) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error

    const { teamId, memberId } = await params
    const token = getToken(request)
    const body = await request.json()
    const res = await fetch(`${API_URL}/teams/${teamId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
    })
    return forwardJson(res, 'Failed to update member')
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ teamId: string; memberId: string }> },
) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error

    const { teamId, memberId } = await params
    const token = getToken(request)
    const res = await fetch(`${API_URL}/teams/${teamId}/members/${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    })
    return forwardJson(res, 'Failed to remove member')
}
