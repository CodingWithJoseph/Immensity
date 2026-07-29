import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { forwardJson, getToken } from '@/lib/apiProxy'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function GET(request: NextRequest, { params }: { params: Promise<{ issueId: string }> }) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error
    const { issueId } = await params
    const token = getToken(request)
    const res = await fetch(`${API_URL}/issues/${issueId}`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    return forwardJson(res, 'Failed to fetch issue')
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ issueId: string }> }) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error
    const { issueId } = await params
    const token = getToken(request)
    const body = await request.json()
    const res = await fetch(`${API_URL}/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
    })
    return forwardJson(res, 'Failed to update issue')
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ issueId: string }> }) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error
    const { issueId } = await params
    const token = getToken(request)
    const res = await fetch(`${API_URL}/issues/${issueId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    })
    return forwardJson(res, 'Failed to archive issue')
}
