import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'

const API_URL = process.env.NEXT_PUBLIC_API_URL

function getToken(request: NextRequest): string | undefined {
    return request.headers.get('Authorization')?.replace('Bearer ', '')
        ?? request.cookies.get('firebase-token')?.value
}

export async function GET(request: NextRequest) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error

    const token = getToken(request)
    const { searchParams } = new URL(request.url)
    const pipeline_id = searchParams.get('pipeline_id')

    const res = await fetch(`${API_URL}/tasks/deadline-summary?pipeline_id=${pipeline_id}`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return NextResponse.json({ error: 'Failed to fetch task deadlines' }, { status: res.status })
    return NextResponse.json(await res.json())
}
