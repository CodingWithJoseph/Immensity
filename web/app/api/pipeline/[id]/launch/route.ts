import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { getToken, forwardJson } from '@/lib/apiProxy'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error

    const { id } = await params
    const token = getToken(request)
    const body = await request.json()

    const res = await fetch(`${API_URL}/pipeline/${id}/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
    })

    return forwardJson(res, 'Launch failed')
}
