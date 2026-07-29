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
    const { searchParams } = request.nextUrl

    const params = new URLSearchParams()
    params.set('limit', searchParams.get('limit') ?? '20')
    params.set('offset', searchParams.get('offset') ?? '0')
    params.set('sort', searchParams.get('sort') ?? 'newest')

    const minPosts = searchParams.get('min_posts')
    if (minPosts) params.set('min_posts', minPosts)
    const subreddit = searchParams.get('subreddit')
    if (subreddit) params.set('subreddit', subreddit)
    const opportunityDomain = searchParams.get('opportunity_domain')
    if (opportunityDomain) params.set('opportunity_domain', opportunityDomain)

    const res = await fetch(`${API_URL}/clusters/browse?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
        let body: unknown = { error: 'Cluster browse failed' }
        try {
            const text = await res.text()
            if (text) body = JSON.parse(text)
        } catch {
            // non-JSON error body - keep the fallback
        }
        return NextResponse.json(body, { status: res.status })
    }

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
