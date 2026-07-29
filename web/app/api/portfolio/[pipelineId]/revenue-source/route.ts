import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { forwardJson, getToken } from '@/lib/apiProxy'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function POST(request: NextRequest, { params }: { params: Promise<{ pipelineId: string }> }) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error
    const { pipelineId } = await params
    const token = getToken(request)
    const body = await request.text()
    const res = await fetch(`${API_URL}/portfolio/${pipelineId}/revenue-source`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body,
    })
    return forwardJson(res, 'Failed to prepare revenue source')
}
