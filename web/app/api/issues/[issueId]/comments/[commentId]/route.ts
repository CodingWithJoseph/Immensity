import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { forwardJson, getToken } from '@/lib/apiProxy'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ issueId: string; commentId: string }> },
) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error
    const { issueId, commentId } = await params
    const token = getToken(request)
    const body = await request.json()
    const res = await fetch(`${API_URL}/issues/${issueId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
    })
    return forwardJson(res, 'Failed to update comment')
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ issueId: string; commentId: string }> },
) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error
    const { issueId, commentId } = await params
    const token = getToken(request)
    const res = await fetch(`${API_URL}/issues/${issueId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    })
    return forwardJson(res, 'Failed to delete comment')
}
