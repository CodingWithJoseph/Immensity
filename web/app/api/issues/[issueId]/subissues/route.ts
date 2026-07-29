import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { forwardJson, getToken } from '@/lib/apiProxy'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function POST(request: NextRequest, { params }: { params: Promise<{ issueId: string }> }) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error
    const { issueId } = await params
    const token = getToken(request)
    const body = await request.json()
    const res = await fetch(`${API_URL}/issues/${issueId}/subissues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
    })
    return forwardJson(res, 'Failed to create subissue')
}
