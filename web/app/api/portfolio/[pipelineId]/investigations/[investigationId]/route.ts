import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { forwardJson, getToken } from '@/lib/apiProxy'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function GET(request: NextRequest, { params }: { params: Promise<{ pipelineId: string; investigationId: string }> }) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error
    const { pipelineId, investigationId } = await params
    const token = getToken(request)
    const res = await fetch(`${API_URL}/portfolio/${pipelineId}/investigations/${investigationId}`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    return forwardJson(res, 'Failed to fetch investigation')
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ pipelineId: string; investigationId: string }> }) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error
    const { pipelineId, investigationId } = await params
    const token = getToken(request)
    const body = await request.text()
    const res = await fetch(`${API_URL}/portfolio/${pipelineId}/investigations/${investigationId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body,
    })
    return forwardJson(res, 'Failed to update investigation')
}
