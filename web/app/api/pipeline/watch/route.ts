import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'

const API_URL = process.env.NEXT_PUBLIC_API_URL

function getToken(request: NextRequest): string | undefined {
    return request.headers.get('Authorization')?.replace('Bearer ', '')
        ?? request.cookies.get('firebase-token')?.value
}

export async function POST(request: NextRequest) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error

    const token = getToken(request)
    const body = await request.json()

    const res = await fetch(`${API_URL}/pipeline/watch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
    })

    let json: unknown = { error: 'Failed to watch cluster' }
    try {
        const text = await res.text()
        if (text) json = JSON.parse(text)
    } catch {
        // keep fallback
    }
    return NextResponse.json(json, { status: res.status })
}
