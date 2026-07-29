import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'

const API_URL = process.env.NEXT_PUBLIC_API_URL

function getToken(request: NextRequest): string | undefined {
    return request.headers.get('Authorization')?.replace('Bearer ', '')
        ?? request.cookies.get('firebase-token')?.value
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error
    const { id } = await params
    const token = getToken(request)
    const query = request.nextUrl.searchParams.toString()
    const res = await fetch(`${API_URL}/pipeline/${id}/signal/evidence${query ? `?${query}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    return NextResponse.json(json, { status: res.status })
}
