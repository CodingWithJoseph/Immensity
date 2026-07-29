import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { forwardJson, getToken } from '@/lib/apiProxy'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function GET(request: NextRequest, { params }: { params: Promise<{ pipelineId: string; problemId: string }> }) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error
    const { pipelineId, problemId } = await params
    const token = getToken(request)
    const res = await fetch(`${API_URL}/portfolio/${pipelineId}/problems/${problemId}${request.nextUrl.search}`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    return forwardJson(res, 'Failed to fetch problem impact')
}
