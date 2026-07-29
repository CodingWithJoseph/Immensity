import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error

    // Body is optional; older callers POST with no body.
    let focusAreas: string[] = []
    try {
        const body = await request.json()
        if (Array.isArray(body?.focusAreas)) {
            focusAreas = body.focusAreas
                .filter((x: unknown): x is string => typeof x === 'string')
                .slice(0, 30)
        }
    } catch {
        // no/invalid JSON body — keep focusAreas empty
    }

    await adminDb.collection('users').doc(user.uid).update({
        onboardingComplete: true,
        focusAreas,
    })

    return NextResponse.json({ success: true })
}