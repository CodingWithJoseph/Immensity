import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { adminDb } from '@/lib/firebase-admin'

// NOTE: There is intentionally no PATCH handler here. The plan / Stripe
// identifiers must never be writable by the client — they are owned by the
// Stripe webhook -> backend. A previous PATCH allowed any authenticated user to
// set their own plan (including "admin"), bypassing the paywall.

export async function DELETE(request: NextRequest) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error

    const userRef = adminDb.collection('users').doc(user.uid)

    const pipeline = await userRef.collection('pipeline').get()
    const portfolio = await userRef.collection('portfolio').get()

    const batch = adminDb.batch()
    pipeline.docs.forEach(doc => batch.delete(doc.ref))
    portfolio.docs.forEach(doc => batch.delete(doc.ref))
    batch.delete(userRef)

    await batch.commit()

    return NextResponse.json({ success: true })
}