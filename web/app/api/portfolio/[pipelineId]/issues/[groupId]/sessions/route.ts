import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { forwardJson, getToken } from '@/lib/apiProxy'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function GET(request: NextRequest, { params }: { params: Promise<{ pipelineId: string; groupId: string }> }) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error
    const { pipelineId, groupId } = await params
    const token = getToken(request)
    const res = await fetch(`${API_URL}/portfolio/${pipelineId}/issues/${groupId}/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    return forwardJson(res, 'Failed to fetch affected sessions')
}
