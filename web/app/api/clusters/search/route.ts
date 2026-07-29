import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'

const API_URL = process.env.NEXT_PUBLIC_API_URL

function getToken(request: NextRequest): string | undefined {
    return request.headers.get('Authorization')?.replace('Bearer ', '')
        ?? request.cookies.get('firebase-token')?.value
}

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl
    const q = searchParams.get('q')?.trim()

    if (!q || q.length < 2) {
        return NextResponse.json({ data: [], total: 0 })
    }

    const { user, error } = await verifyAuth(request)
    if (!user) return error

    const token = getToken(request)

    const params = new URLSearchParams({ q })
    params.set('limit', searchParams.get('limit') ?? '20')
    params.set('offset', searchParams.get('offset') ?? '0')
    const minPosts = searchParams.get('min_posts')
    if (minPosts) params.set('min_posts', minPosts)
    const opportunityType = searchParams.get('opportunity_type')
    if (opportunityType) params.set('opportunity_type', opportunityType)
    const opportunityDomain = searchParams.get('opportunity_domain')
    if (opportunityDomain) params.set('opportunity_domain', opportunityDomain)

    const res = await fetch(`${API_URL}/clusters/search?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
        let body: unknown = { error: 'Cluster search failed' }
        try {
            const text = await res.text()
            if (text) body = JSON.parse(text)
        } catch {
            // non-JSON error body — keep the fallback
        }
        return NextResponse.json(body, { status: res.status })
    }

    // Normalize to the `{ data, total }` shape the Explore page expects. The
    // backend may return a bare array or wrap results under `data`/`clusters`.
    const json: unknown = await res.json()
    const data = Array.isArray(json)
        ? json
        : Array.isArray((json as { data?: unknown })?.data)
          ? (json as { data: unknown[] }).data
          : Array.isArray((json as { clusters?: unknown })?.clusters)
            ? (json as { clusters: unknown[] }).clusters
            : []
    const total =
        typeof (json as { total?: unknown })?.total === 'number'
            ? (json as { total: number }).total
            : data.length

    return NextResponse.json({ data, total })
}
