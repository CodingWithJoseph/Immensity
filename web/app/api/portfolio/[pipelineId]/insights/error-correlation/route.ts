import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { forwardJson, getToken } from '@/lib/apiProxy'

const API_URL = process.env.NEXT_PUBLIC_API_URL

// Alias of /correlation (the usage↔errors correlation), named to disambiguate
// from /insights/revenue-correlation. The original path still works.
export async function GET(request: NextRequest, { params }: { params: Promise<{ pipelineId: string }> }) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error
    const { pipelineId } = await params
    const token = getToken(request)
    const res = await fetch(`${API_URL}/portfolio/${pipelineId}/insights/error-correlation`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    return forwardJson(res, 'Failed to fetch error correlation')
}
