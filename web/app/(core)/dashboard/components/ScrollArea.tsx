'use client'

import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

export default function ScrollArea({
    children,
    className = '',
    contentClassName = '',
    ariaLabel = 'Scroll down',
    enabled = true,
}: {
    children: ReactNode
    className?: string
    contentClassName?: string
    ariaLabel?: string
    enabled?: boolean
}) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [hasMore, setHasMore] = useState(false)

    const updateHasMore = useCallback(() => {
        const element = scrollRef.current
        if (!element) return
        setHasMore(element.scrollHeight - element.scrollTop - element.clientHeight > 2)
    }, [])

    useEffect(() => {
        const element = scrollRef.current
        if (!element) return

        updateHasMore()
        if (!enabled || typeof ResizeObserver === 'undefined' || typeof MutationObserver === 'undefined') return

        const resizeObserver = new ResizeObserver(updateHasMore)
        const mutationObserver = new MutationObserver(updateHasMore)
        resizeObserver.observe(element)
        mutationObserver.observe(element, { childList: true, subtree: true, characterData: true })

        return () => {
            resizeObserver.disconnect()
            mutationObserver.disconnect()
        }
    }, [enabled, updateHasMore])

    return (
        <div className={`relative min-h-0 min-w-0 ${className}`}>
            <div
                ref={scrollRef}
                onScroll={updateHasMore}
                className={`h-full min-h-0 min-w-0 overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
                    enabled ? 'overflow-y-auto' : 'overflow-y-hidden'
                } ${contentClassName}`}
            >
                {children}
            </div>
            {enabled && hasMore && (
                <button
                    type='button'
                    onClick={() => scrollRef.current?.scrollBy({ top: scrollRef.current.clientHeight * 0.75, behavior: 'smooth' })}
                    aria-label={ariaLabel}
                    className='absolute bottom-3 left-1/2 z-20 inline-flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full bg-(--color-button) text-(--color-on-button) shadow-md transition-colors hover:bg-(--color-button-hover)'
                >
                    <ChevronDown size={20} aria-hidden />
                </button>
            )}
        </div>
    )
}
