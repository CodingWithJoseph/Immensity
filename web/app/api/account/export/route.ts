import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { forwardJson, getToken } from '@/lib/apiProxy'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function GET(request: NextRequest) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error
    const token = getToken(request)
    const res = await fetch(`${API_URL}/preferences/export`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    return forwardJson(res, 'Failed to export data')
}
