import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error

    const userDoc = await adminDb.collection('users').doc(user.uid).get()
    if (!userDoc.exists) {
        return NextResponse.json({ complete: false })
    }

    const data = userDoc.data()
    return NextResponse.json({ complete: data?.onboardingComplete ?? false })
}