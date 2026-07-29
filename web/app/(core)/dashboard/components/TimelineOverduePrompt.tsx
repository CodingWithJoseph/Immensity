'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { routes } from '@/app/util/routes'
import { TIMELINE_OPTIONS } from '@/lib/timeline'

interface Props {
    pipelineId: string
    // Called after the timeline is extended so the header can re-read the card.
    onExtended: () => void
}

function WarnIcon() {
    return (
        <span className="mt-px grid h-4 w-4 shrink-0 place-items-center text-(--color-error)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
        </span>
    )
}

// Shown in the project header when a project is past its target launch date and
// not launched. Non-blocking: it offers to extend the timeline (a fresh window
// starting today) or archive the project. Never hard-blocks the project.
export default function TimelineOverduePrompt({ pipelineId, onExtended }: Props) {
    const router = useRouter()
    const [mode, setMode] = useState<'idle' | 'extend' | 'confirm-archive'>('idle')
    const [saving, setSaving] = useState(false)

    async function handleExtend(days: number) {
        setSaving(true)
        try {
            const res = await fetch(`/api/pipeline/${pipelineId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ timeline_days: days }),
            })
            if (!res.ok) throw new Error('extend failed')
            toast.success('Timeline extended')
            setMode('idle')
            onExtended()
        } catch {
            toast.error('Could not extend the timeline. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    async function handleArchive() {
        setSaving(true)
        try {
            const res = await fetch(`/api/pipeline/${pipelineId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('archive failed')
            toast.success('Project archived')
            router.push(routes.core.pipeline)
        } catch {
            toast.error('Could not archive the project. Please try again.')
            setSaving(false)
        }
    }

    const shell = 'pf-fade-in flex gap-2.5 rounded-xl border-l-2 border-(--color-error) bg-(--color-error-soft) p-3'
    const secondaryBtn = 'rounded-lg border border-(--color-border-strong) bg-(--color-surface-raised) px-3 py-1.5 text-xs font-semibold text-(--color-text) transition-all hover:-translate-y-px hover:shadow-[var(--shadow-sm)] disabled:opacity-50'
    const cancelBtn = 'px-2 py-1.5 text-xs font-medium text-(--color-text-muted) underline-offset-4 transition-colors hover:text-(--color-text) hover:underline'

    if (mode === 'extend') {
        return (
            <div className={shell}>
                <WarnIcon />
                <div className="flex flex-1 flex-col gap-2">
                    <p className="text-xs font-semibold text-(--color-text)">Pick a new window — it starts today.</p>
                    <div className="flex flex-wrap gap-2">
                        {TIMELINE_OPTIONS.map(option => (
                            <button key={option.days} type="button" disabled={saving} onClick={() => handleExtend(option.days)} className={secondaryBtn}>
                                {option.label}
                            </button>
                        ))}
                        <button type="button" onClick={() => setMode('idle')} disabled={saving} className={cancelBtn}>Cancel</button>
                    </div>
                </div>
            </div>
        )
    }

    if (mode === 'confirm-archive') {
        return (
            <div className={`${shell} items-center justify-between`}>
                <div className="flex gap-2.5">
                    <WarnIcon />
                    <p className="text-xs font-medium text-(--color-text)">Archive this project? You can find it later in your pipeline.</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <button type="button" onClick={handleArchive} disabled={saving}
                            className="rounded-lg bg-(--color-error) px-3 py-1.5 text-xs font-semibold text-(--color-white) transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50">
                        {saving ? 'Archiving…' : 'Archive'}
                    </button>
                    <button type="button" onClick={() => setMode('idle')} disabled={saving} className={cancelBtn}>Cancel</button>
                </div>
            </div>
        )
    }

    return (
        <div className={`${shell} items-center justify-between`}>
            <div className="flex gap-2.5">
                <WarnIcon />
                <p className="text-xs font-medium text-(--color-text)">
                    <span className="font-semibold">Past your target launch date.</span> Extend the timeline or archive this project.
                </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
                <button type="button" onClick={() => setMode('extend')} className={secondaryBtn}>Extend timeline</button>
                <button type="button" onClick={() => setMode('confirm-archive')} className={cancelBtn}>Archive</button>
            </div>
        </div>
    )
}
