import { NextRequest } from 'next/server'
import { forwardJson } from '@/lib/apiProxy'

const API_URL = process.env.NEXT_PUBLIC_API_URL

// Public: previewing an invite must work before the recipient signs in, so this
// route intentionally does not require auth — it mirrors the backend's public
// GET /invites/{token}.
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> },
) {
    const { token } = await params
    const res = await fetch(`${API_URL}/invites/${token}`)
    return forwardJson(res, 'Failed to load invite')
}
