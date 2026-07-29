const DEFAULT_SITE_ORIGIN = 'https://useimmensity.com'
const DEFAULT_MARKETING_ORIGIN = 'https://www.useimmensity.com'
const DEFAULT_APP_ORIGIN = 'https://console.useimmensity.com'

type PublicEnv = {
    NODE_ENV?: string
    NEXT_PUBLIC_APP_URL?: string
    NEXT_PUBLIC_MARKETING_URL?: string
    NEXT_PUBLIC_SITE_URL?: string
}

export function normalizeOrigin(value?: string) {
    const origin = value?.trim().replace(/\/+$/, '')
    return origin || undefined
}

export function normalizeHost(value?: string | null) {
    const host = value?.split(',')[0]?.trim().toLowerCase() ?? ''

    if (host.startsWith('[')) {
        const bracket = host.indexOf(']')
        if (bracket > -1) return host.slice(1, bracket)
    }

    if (host === '::1') return host

    return host.split(':')[0]
}

export function isLocalHost(host: string) {
    const normalized = normalizeHost(host)
    return normalized === 'localhost'
        || normalized.endsWith('.localhost')
        || normalized === '127.0.0.1'
        || normalized === '0.0.0.0'
        || normalized === '::1'
}

export function appOriginForDomainRouting(env: PublicEnv = process.env) {
    return normalizeOrigin(env.NEXT_PUBLIC_APP_URL) ?? DEFAULT_APP_ORIGIN
}

export function siteOriginForDomainRouting(env: PublicEnv = process.env) {
    return normalizeOrigin(env.NEXT_PUBLIC_SITE_URL) ?? DEFAULT_SITE_ORIGIN
}

export function appOriginForPublicLinks(env: PublicEnv = process.env) {
    const configured = normalizeOrigin(env.NEXT_PUBLIC_APP_URL)

    if (env.NODE_ENV === 'production') {
        return configured ?? DEFAULT_APP_ORIGIN
    }

    return undefined
}

export function marketingOriginForPublicLinks(env: PublicEnv = process.env) {
    return normalizeOrigin(env.NEXT_PUBLIC_MARKETING_URL) ?? DEFAULT_MARKETING_ORIGIN
}

export function appHref(path: string, env: PublicEnv = process.env) {
    const origin = appOriginForPublicLinks(env)
    return origin ? `${origin}${path}` : path
}

export function hostnamesForOrigin(origin: string, includeWwwVariant = false) {
    const host = normalizeHost(new URL(origin).hostname)
    const hosts = new Set([host])

    if (includeWwwVariant) {
        if (host.startsWith('www.')) {
            hosts.add(host.replace(/^www\./, ''))
        } else {
            hosts.add(`www.${host}`)
        }
    }

    return hosts
}
