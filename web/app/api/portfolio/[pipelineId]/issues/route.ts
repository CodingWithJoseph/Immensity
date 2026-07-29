import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { forwardJson, getToken } from '@/lib/apiProxy'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function GET(request: NextRequest, { params }: { params: Promise<{ pipelineId: string }> }) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error
    const { pipelineId } = await params
    const token = getToken(request)
    // Forward the dimension filters (errorType, platform) through to the API.
    const incoming = request.nextUrl.searchParams
    const qs = new URLSearchParams()
    for (const key of ['errorType', 'platform']) {
        const value = incoming.get(key)
        if (value) qs.set(key, value)
    }
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    const res = await fetch(`${API_URL}/portfolio/${pipelineId}/issues${suffix}`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    return forwardJson(res, 'Failed to fetch issues')
}
