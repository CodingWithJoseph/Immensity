type LegacySearchParams = Record<string, string | string[] | undefined>

export function redirectTarget(basePath: string, searchParams: LegacySearchParams) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(searchParams)) {
        if (Array.isArray(value)) {
            value.forEach(item => params.append(key, item))
        } else if (value) {
            params.set(key, value)
        }
    }
    const query = params.toString()
    return query ? `${basePath}?${query}` : basePath
}

export type LegacyPageProps = {
    searchParams: Promise<LegacySearchParams>
}
