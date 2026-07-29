import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { forwardJson, getToken } from '@/lib/apiProxy'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function GET(request: NextRequest) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error
    const token = getToken(request)
    const res = await fetch(`${API_URL}/portfolio/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    return forwardJson(res, 'Failed to load monitoring settings')
}

export async function PUT(request: NextRequest) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error
    const token = getToken(request)
    const body = await request.text()
    const res = await fetch(`${API_URL}/portfolio/admin/settings`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body,
    })
    return forwardJson(res, 'Failed to save monitoring settings')
}
