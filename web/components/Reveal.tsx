'use client'

import React, { useEffect, useRef, useState } from 'react'

type RevealProps = {
    children: React.ReactNode
    /** Stagger delay in ms */
    delay?: number
    className?: string
    /** Render element tag */
    as?: 'div' | 'section' | 'li' | 'span'
    /** Re-trigger threshold */
    threshold?: number
}

/**
 * Subtle fade + slide-up when scrolled into view. Animates once.
 * Honors prefers-reduced-motion via the .reveal CSS (no transform/transition).
 */
export default function Reveal({
    children,
    delay = 0,
    className = '',
    as = 'div',
    threshold = 0.18,
}: RevealProps) {
    const ref = useRef<HTMLElement | null>(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const node = ref.current
        if (!node) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true)
                    observer.disconnect()
                }
            },
            { threshold, rootMargin: '0px 0px -8% 0px' },
        )

        observer.observe(node)
        return () => observer.disconnect()
    }, [threshold])

    const Tag = as as React.ElementType
    return (
        <Tag
            ref={ref}
            className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
            style={{ ['--reveal-delay' as string]: `${delay}ms` }}
        >
            {children}
        </Tag>
    )
}
