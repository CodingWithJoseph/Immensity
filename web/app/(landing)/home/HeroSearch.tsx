'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { routes } from '@/app/util/routes'

export default function HeroSearch() {
    const [query, setQuery] = useState('')
    const router = useRouter()

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const trimmedQuery = query.trim()
        const search = trimmedQuery ? `?${new URLSearchParams({ q: trimmedQuery }).toString()}` : ''
        router.push(`${routes.landing.demo}${search}#clusters`)
    }

    return (
        <form onSubmit={handleSubmit} className="pf-search">
            <label className="sr-only" htmlFor="hero-cluster-search">Search opportunity clusters</label>
            <input
                id="hero-cluster-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="What are you exploring?"
            />
            <button type="submit">Explore clusters</button>
        </form>
    )
}
