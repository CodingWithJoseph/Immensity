import { NextRequest } from 'next/server'
import { forwardJson } from '@/lib/apiProxy'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function POST(request: NextRequest) {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!

    const res = await fetch(`${API_URL}/subscriptions/webhook`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'stripe-signature': signature,
        },
        body,
    })

    return forwardJson(res, 'Webhook proxy failed')
}