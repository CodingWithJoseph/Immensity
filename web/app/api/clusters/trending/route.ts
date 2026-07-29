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
    const limit = searchParams.get('limit') ?? '10'

    const res = await fetch(`${API_URL}/clusters/trending?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return NextResponse.json({ error: 'Failed to fetch trending clusters' }, { status: res.status })

    // The backend's response shape for this endpoint is inconsistent — it may
    // return a bare array, `{ data: [...] }`, or `{ clusters: [...] }`. Callers
    // (the Explore feed and dashboard) both expect `{ data: [...] }`, so
    // normalize here to a single shape rather than have every caller guess.
    const json: unknown = await res.json()
    const data = Array.isArray(json)
        ? json
        : Array.isArray((json as { data?: unknown })?.data)
          ? (json as { data: unknown[] }).data
          : Array.isArray((json as { clusters?: unknown })?.clusters)
            ? (json as { clusters: unknown[] }).clusters
            : []

    return NextResponse.json({ data })
}
