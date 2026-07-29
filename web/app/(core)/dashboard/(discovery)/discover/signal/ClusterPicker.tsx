'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { PipelineCard } from '@/lib/types/cluster'
import { routes } from '@/app/util/routes'
import { Card, Skeleton } from './ui'

export default function ClusterPicker() {
    const router = useRouter()
    const [cards, setCards] = useState<PipelineCard[] | null>(null)

    useEffect(() => {
        let cancelled = false
        void (async () => {
            const res = await fetch('/api/pipeline')
            if (!res.ok) return
            const json = (await res.json()) as { data: PipelineCard[] }
            if (!cancelled) setCards(json.data)
        })()
        return () => { cancelled = true }
    }, [])

    return (
        <div className='mx-auto w-full max-w-xl'>
            <Card>
                {cards == null ? (
                    <div className='flex flex-col gap-3'>
                        <Skeleton className='h-16 w-full' />
                        <Skeleton className='h-16 w-full' />
                    </div>
                ) : cards.length === 0 ? (
                    <div className='text-center py-8'>
                        <p className='text-sm text-(--color-text-muted) mb-4'>Your pipeline is empty.</p>
                        <Link href={routes.core.explore} className='text-sm font-medium text-(--color-link) transition-colors hover:text-(--color-link-hover) hover:underline'>
                            Search opportunities
                        </Link>
                    </div>
                ) : (
                    <ul className='flex flex-col gap-2'>
                        {cards.map(card => (
                            <li key={card.id}>
                                <button
                                    type='button'
                                    onClick={() => router.push(`/dashboard/discover/signal?pipelineId=${card.id}`)}
                                    className='w-full text-left border border-(--color-border) rounded-xl p-4 hover:border-(--color-text-muted) hover:bg-(--color-bg) transition-colors'
                                >
                                    <div className='flex justify-between gap-3'>
                                        <p className='text-sm font-medium text-(--color-text)'>{card.name}</p>
                                        <span className='text-[10px] uppercase tracking-wider text-(--color-text-muted)'>{card.stage}</span>
                                    </div>
                                    <p className='text-xs text-(--color-text-muted) mt-1'>{card.posts.length || card.postIds.length} posts</p>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    )
}
