import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
    appOriginForDomainRouting,
    hostnamesForOrigin,
    isLocalHost,
    normalizeHost,
    siteOriginForDomainRouting,
} from '@/lib/domain-routing'
import { featureProfile, isDeferredPath } from '@/lib/features'
import { routes } from '@/app/util/routes'

const SITE_ORIGIN = siteOriginForDomainRouting()
const APP_ORIGIN = appOriginForDomainRouting()
const MARKETING_HOSTS = hostnamesForOrigin(SITE_ORIGIN, true)
const CONSOLE_HOSTS = hostnamesForOrigin(APP_ORIGIN)

const APP_PATHS = [
    '/dashboard',
    '/sign-in',
    '/sign-up',
    '/forgot-password',
    '/login',
    '/auth',
    '/onboarding',
    '/success',
    '/cancel',
]

function matchesPath(pathname: string, prefix: string) {
    return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function requestHost(request: NextRequest) {
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
    return normalizeHost(forwardedHost ?? request.headers.get('host') ?? request.nextUrl.host)
}

function redirectToOrigin(request: NextRequest, origin: string) {
    const url = request.nextUrl.clone()
    const destination = new URL(origin)
    url.protocol = destination.protocol
    url.hostname = destination.hostname
    url.port = destination.port
    return NextResponse.redirect(url)
}

function isInternalOrStaticPath(pathname: string) {
    return pathname === '/_next'
        || pathname.startsWith('/_next/')
        || pathname === '/api'
        || pathname.startsWith('/api/')
        || pathname === '/favicon.ico'
        || /\.[^/]+$/.test(pathname)
}

export function proxy(request: NextRequest) {
    const token = request.cookies.get('firebase-token')?.value
    const { pathname } = request.nextUrl
    const host = requestHost(request)
    const isLocalRequest = isLocalHost(host)
    const isConsoleHost = !isLocalRequest && CONSOLE_HOSTS.has(host)
    const isMarketingHost = !isLocalRequest && MARKETING_HOSTS.has(host)
    const isAppPath = APP_PATHS.some(prefix => matchesPath(pathname, prefix))

    // API routes and build/static assets must remain available on either domain.
    if (isInternalOrStaticPath(pathname)) {
        return NextResponse.next()
    }

    if (isConsoleHost && pathname !== '/' && !isAppPath) {
        return redirectToOrigin(request, SITE_ORIGIN)
    }

    if (isMarketingHost && isAppPath) {
        return redirectToOrigin(request, APP_ORIGIN)
    }

    if (isConsoleHost && pathname === '/') {
        return NextResponse.redirect(new URL(token ? '/dashboard' : '/sign-in', request.url))
    }

    if (token && (pathname === '/' || matchesPath(pathname, '/sign-in') || matchesPath(pathname, '/sign-up'))) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (!token && matchesPath(pathname, '/dashboard')) {
        const signInUrl = new URL('/sign-in', request.url)
        // Only preserve relative, in-app paths to prevent open redirects.
        // A safe path starts with a single '/' (not '//' or '/\', which can be
        // interpreted as a protocol-relative URL to an external host).
        if (pathname.startsWith('/') && !pathname.startsWith('//') && !pathname.startsWith('/\\')) {
            signInUrl.searchParams.set('redirect', `${pathname}${request.nextUrl.search}`)
        }
        return NextResponse.redirect(signInUrl)
    }

    // The initial release has no dashboard. Signed-in users enter the product
    // through the conversational Search surface instead.
    if (token && featureProfile === 'core' && pathname === routes.core.dashboard) {
        return NextResponse.redirect(new URL(routes.core.explore, request.url))
    }

    if (token && isDeferredPath(featureProfile, pathname)) {
        return NextResponse.redirect(new URL(routes.core.pipeline, request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/:path*']
}
