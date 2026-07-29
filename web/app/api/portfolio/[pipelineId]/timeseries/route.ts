import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { forwardJson, getToken } from '@/lib/apiProxy'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function GET(request: NextRequest, { params }: { params: Promise<{ pipelineId: string }> }) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error
    const { pipelineId } = await params
    const token = getToken(request)
    const metric = request.nextUrl.searchParams.get('metric')
    const qs = metric ? `?metric=${encodeURIComponent(metric)}` : ''
    const res = await fetch(`${API_URL}/portfolio/${pipelineId}/timeseries${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    return forwardJson(res, 'Failed to fetch timeseries')
}
