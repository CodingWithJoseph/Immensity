'use client'

import { useEffect } from 'react'
import { useDialogFocus } from '@/app/(core)/dashboard/hooks/useDialogFocus'
import TeamDetailsPanel from './TeamDetailsPanel'
import type { Team } from '@/lib/types/team'

/**
 * Small-screen presentation of the team details: an overlay drawer wrapping the
 * shared TeamDetailsPanel. On `lg`+ the page renders TeamDetailsPanel inline as a
 * persistent pane instead of this overlay.
 */
export default function TeamDetailsDrawer({
    teamId,
    teamName,
    onClose,
    onChanged,
    onDeleted,
}: {
    teamId: string
    teamName?: string
    onClose: () => void
    onChanged: (team: Team) => void
    onDeleted: (id: string) => void
}) {
    const dialogRef = useDialogFocus<HTMLElement>()
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [onClose])

    return (
        <div className="pf-fade-in fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
            <aside
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                tabIndex={-1}
                aria-label={teamName ? `${teamName} details` : 'Team details'}
                onClick={e => e.stopPropagation()}
                className="flex h-full w-full max-w-lg flex-col border-l border-(--color-border) bg-(--color-card) shadow-2xl outline-none"
            >
                <TeamDetailsPanel teamId={teamId} onClose={onClose} onChanged={onChanged} onDeleted={onDeleted} />
            </aside>
        </div>
    )
}
