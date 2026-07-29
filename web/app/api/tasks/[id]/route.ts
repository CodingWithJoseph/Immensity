import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'

const API_URL = process.env.NEXT_PUBLIC_API_URL

function getToken(request: NextRequest): string | undefined {
    return request.headers.get('Authorization')?.replace('Bearer ', '')
        ?? request.cookies.get('firebase-token')?.value
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error

    const { id } = await params
    const token = getToken(request)
    const body = await request.json()

    const res = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
    })

    const json = await res.json()
    if (!res.ok) return NextResponse.json(json, { status: res.status })
    return NextResponse.json(json)
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error

    const { id } = await params
    const token = getToken(request)

    const res = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    })

    const json = await res.json()
    if (!res.ok) return NextResponse.json(json, { status: res.status })
    return NextResponse.json(json)
}
