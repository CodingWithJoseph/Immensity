import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function GET(request: NextRequest) {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    if (!code || !state) {
        return NextResponse.redirect(new URL('/dashboard/monitor/setup?stripe=error', url.origin))
    }

    const res = await fetch(`${API_URL}/portfolio/revenue-source/stripe/callback?${new URLSearchParams({ code, state })}`)
    const text = await res.text()
    if (!res.ok) {
        return NextResponse.redirect(new URL('/dashboard/monitor/setup?stripe=error', url.origin))
    }
    const body = text ? JSON.parse(text) : {}
    const redirectUrl = body?.data?.redirectUrl
    return NextResponse.redirect(redirectUrl || new URL('/dashboard/monitor/setup?stripe=connected', url.origin))
}
