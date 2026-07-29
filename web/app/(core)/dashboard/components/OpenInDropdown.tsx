'use client'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { DOWNSTREAM_ROOMS } from '@/app/util/features'

type DropdownAction = {
    key: string
    label: string
    onSelect: () => void
    danger?: boolean
    disabled?: boolean
}

interface Props {
    pipelineId?: string
    label?: string
    actionItems?: DropdownAction[]
}

export default function OpenInDropdown({ pipelineId, label = 'Open in', actionItems = [] }: Props) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const available = DOWNSTREAM_ROOMS
    const hasActions = actionItems.length > 0

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    function buildHref(href: string) {
        if (!pipelineId) return href
        const sep = href.includes('?') ? '&' : '?'
        return `${href}${sep}pipelineId=${pipelineId}`
    }

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(prev => !prev)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-(--color-border) text-(--color-text-muted) hover:text-(--color-text) hover:bg-(--color-border) transition-colors"
            >
                {label}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6"/>
                </svg>
            </button>

            {open && (
                <div className="absolute bottom-full mb-2 right-0 bg-(--color-surface) border border-(--color-border) rounded-xl shadow-lg p-1 z-50 min-w-44">
                    {available.length === 0 && (
                        <p className="px-3 py-2 text-sm text-(--color-text-muted) opacity-50">No rooms available</p>
                    )}
                    {available.map(room => (
                        <Link
                            key={room.key}
                            href={buildHref(room.href)}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-(--color-text-muted) hover:bg-(--color-border) hover:text-(--color-text) transition-colors"
                        >
                            {room.label}
                        </Link>
                    ))}
                    {hasActions && <div className="my-1 h-px bg-(--color-border)" />}
                    {actionItems.map(item => (
                        <button
                            key={item.key}
                            type="button"
                            disabled={item.disabled}
                            onClick={() => {
                                if (item.disabled) return
                                item.onSelect()
                                setOpen(false)
                            }}
                            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:opacity-40 ${
                                item.danger
                                    ? 'text-(--color-error) hover:bg-(--color-bg)'
                                    : 'text-(--color-text-muted) hover:bg-(--color-border) hover:text-(--color-text)'
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
