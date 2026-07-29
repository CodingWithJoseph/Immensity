import { adminAuth } from '@/lib/firebase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function verifyAuth(request: NextRequest) {
    let token = request.cookies.get('firebase-token')?.value

    if (!token) {
        const authHeader = request.headers.get('Authorization')
        token = authHeader?.replace('Bearer ', '') ?? undefined
    }

    if (!token) {
        return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    }

    try {
        const decodedToken = await adminAuth.verifyIdToken(token)
        return { user: decodedToken, error: null }
    } catch {
        return { user: null, error: NextResponse.json({ error: 'Invalid token' }, { status: 401 }) }
    }
}