import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error

    const doc = await adminDb.collection('users').doc(user.uid).get()
    const data = doc.data()

    return NextResponse.json({
        plan: data?.plan ?? 'free',
        cancelAtPeriodEnd: data?.cancelAtPeriodEnd ?? false,
        currentPeriodEnd: data?.currentPeriodEnd ?? null,
    })
}