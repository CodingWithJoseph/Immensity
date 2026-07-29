'use client'

import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { useDialogFocus } from '@/app/(core)/dashboard/hooks/useDialogFocus'
import { Button } from '@/app/(core)/dashboard/components/Button'
import { teamsApi, teamInitial } from '@/lib/teamsApi'
import type { Team, TeamRole } from '@/lib/types/team'

type InviteRole = Extract<TeamRole, 'member' | 'admin'>
type InviteDraft = { email: string; role: InviteRole }

const inputClass = 'w-full rounded-md border border-(--color-border) bg-(--color-card) px-3 py-2 text-sm text-(--color-text) outline-none placeholder:text-(--color-text-muted) focus:border-(--color-focus)'
const labelClass = 'mb-1 block text-xs font-semibold text-(--color-text-muted)'

export default function CreateTeamModal({ onClose, onCreated }: { onClose: () => void; onCreated: (team: Team) => void }) {
    const dialogRef = useDialogFocus<HTMLDivElement>()
    const [step, setStep] = useState<'create' | 'invite'>('create')
    const [team, setTeam] = useState<Team | null>(null)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [invites, setInvites] = useState<InviteDraft[]>([{ email: '', role: 'member' }])
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function submitCreate(event: FormEvent) {
        event.preventDefault()
        if (!name.trim() || busy) return
        setBusy(true)
        setError(null)
        try {
            const created = await teamsApi.create(name.trim(), description.trim() || null)
            onCreated(created)
            setTeam(created)
            setStep('invite')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not create team')
        } finally {
            setBusy(false)
        }
    }

    function updateInvite(index: number, patch: Partial<InviteDraft>) {
        setInvites(current => current.map((invite, i) => (i === index ? { ...invite, ...patch } : invite)))
    }

    async function sendInvites() {
        if (!team || busy) return
        const pending = invites.filter(invite => invite.email.trim())
        setBusy(true)
        setError(null)
        try {
            for (const invite of pending) {
                await teamsApi.invite(team.id, invite.email.trim(), invite.role)
            }
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not send invites')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="pf-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                tabIndex={-1}
                aria-label={step === 'create' ? 'Create team' : 'Invite members'}
                onClick={event => event.stopPropagation()}
                className="w-full max-w-md overflow-hidden rounded-md border border-(--color-border) bg-(--color-card) shadow-xl outline-none"
            >
                <div className="flex items-center justify-between border-b border-(--color-border) px-5 py-4">
                    <h2 className="text-sm font-semibold text-(--color-text)">{step === 'create' ? 'Create team' : 'Invite members'}</h2>
                    <button type="button" aria-label="Close" onClick={onClose} className="rounded-md p-1 text-(--color-text-muted) hover:bg-(--color-bg) hover:text-(--color-text)">
                        <X aria-hidden className="h-4 w-4" />
                    </button>
                </div>

                {step === 'create' ? (
                    <form onSubmit={submitCreate} className="flex flex-col gap-4 p-5">
                        <div>
                            <label className={labelClass} htmlFor="team-name">Team name</label>
                            <input id="team-name" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Growth" className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass} htmlFor="team-description">Description <span className="font-normal">(optional)</span></label>
                            <textarea id="team-description" value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="What does this team work on?" className={`${inputClass} resize-none`} />
                        </div>
                        {error && <p role="alert" className="text-xs text-(--color-error)">{error}</p>}
                        <div className="flex justify-end pt-1">
                            <Button type="submit" variant="primary" disabled={!name.trim() || busy}>{busy ? 'Creating…' : 'Create team'}</Button>
                        </div>
                    </form>
                ) : (
                    <div className="flex flex-col gap-4 p-5">
                        <div className="flex items-center gap-2">
                            <span aria-hidden className="grid h-8 w-8 place-items-center rounded-md bg-(--color-button) text-sm font-semibold text-(--color-on-button)">{teamInitial(team?.name ?? '')}</span>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-(--color-text)">{team?.name}</p>
                                <p className="text-xs text-(--color-text-muted)">You can invite members now or add them later from Team Details.</p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            {invites.map((invite, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input
                                        type="email"
                                        value={invite.email}
                                        onChange={e => updateInvite(index, { email: e.target.value })}
                                        placeholder="name@company.com"
                                        aria-label={`Invite email ${index + 1}`}
                                        className={`${inputClass} flex-1`}
                                    />
                                    <select
                                        value={invite.role}
                                        onChange={e => updateInvite(index, { role: e.target.value as InviteRole })}
                                        aria-label={`Invite role ${index + 1}`}
                                        className="rounded-md border border-(--color-border) bg-(--color-card) py-2 pl-2 pr-8 text-sm text-(--color-text) outline-none focus:border-(--color-focus)"
                                    >
                                        <option value="member">Member</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            ))}
                            <button type="button" onClick={() => setInvites(current => [...current, { email: '', role: 'member' }])} className="inline-flex w-fit items-center gap-1 text-xs font-semibold text-(--color-link) hover:text-(--color-link-hover)">
                                Add another
                            </button>
                        </div>
                        {error && <p role="alert" className="text-xs text-(--color-error)">{error}</p>}
                        <div className="flex justify-end gap-2 pt-1">
                            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Skip for now</Button>
                            <Button type="button" variant="primary" onClick={sendInvites} disabled={busy || !invites.some(i => i.email.trim())}>{busy ? 'Sending…' : 'Send invites'}</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
