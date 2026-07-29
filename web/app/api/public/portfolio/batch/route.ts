import { NextRequest, NextResponse } from 'next/server'
import { forwardJson } from '@/lib/apiProxy'

const API_URL = process.env.NEXT_PUBLIC_API_URL

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(request: NextRequest) {
    // The beacon may deliver the batch via sendBeacon (text/plain Blob, to avoid
    // a CORS preflight on unload) or a normal JSON fetch. Either way the body is
    // a JSON string; read it as text and forward as JSON.
    const body = await request.text()
    const res = await fetch(`${API_URL}/public/portfolio/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
    })
    const response = await forwardJson(res, 'Failed to record usage batch')
    for (const [key, value] of Object.entries(corsHeaders)) {
        response.headers.set(key, value)
    }
    return response
}
