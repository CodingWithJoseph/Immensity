'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import type { SignalWorkspace } from '@/lib/types/signals'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import { routes } from '@/app/util/routes'

export default function SignalHeader({
    workspace,
}: {
    workspace: SignalWorkspace
    collapsed?: boolean
    onToggleCollapsed?: () => void
}) {
    const router = useRouter()
    const [pending, setPending] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    async function removeFromPipeline() {
        setPending(true)
        const res = await fetch(`/api/pipeline/${workspace.pipeline.id}`, { method: 'DELETE' })
        setPending(false)
        if (!res.ok) return toast.error('Could not remove this opportunity')
        toast.success('Removed from Pipeline')
        router.push(routes.core.signal)
    }

    return (
        <div className='relative shrink-0' ref={menuRef}>
            <button
                type='button'
                onClick={() => setMenuOpen(value => !value)}
                aria-label='Signal actions'
                aria-expanded={menuOpen}
                className='inline-flex h-8 w-8 items-center justify-center rounded-md border border-(--color-border) text-(--color-text-muted) transition-colors hover:bg-(--color-border) hover:text-(--color-text)'
            >
                <MoreHorizontal size={16} aria-hidden />
            </button>
            {menuOpen && (
                <div className='absolute right-0 top-full z-50 mt-2 min-w-48 rounded-md border border-(--color-border) bg-(--color-surface) p-1.5 shadow-lg'>
                    <button
                        type='button'
                        disabled={pending}
                        onClick={() => void removeFromPipeline()}
                        className='flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-(--color-text) transition-colors hover:bg-(--color-bg) disabled:opacity-40'
                    >
                        <Trash2 size={14} aria-hidden />
                        Remove from Pipeline
                    </button>
                </div>
            )}
        </div>
    )
}
