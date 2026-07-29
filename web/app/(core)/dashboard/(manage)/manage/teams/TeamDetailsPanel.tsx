'use client'

import { useEffect, useState } from 'react'
import { Pencil, X } from 'lucide-react'
import { Button } from '@/app/(core)/dashboard/components/Button'
import Chip from '@/app/(core)/dashboard/components/Chip'
import UserAvatar from '@/app/(core)/dashboard/components/UserAvatar'
import { teamsApi, teamInitial, memberDisplayName, groupMembers, formatTeamDate } from '@/lib/teamsApi'
import type { Team, TeamMember, TeamRole } from '@/lib/types/team'
import type { PipelineCard } from '@/lib/types/cluster'

const ROLE_LABELS: Record<TeamRole, string> = { owner: 'Owner', admin: 'Admin', member: 'Member' }
const inputClass = 'w-full rounded-md border border-(--color-border) bg-(--color-card) px-3 py-2 text-sm text-(--color-text) outline-none placeholder:text-(--color-text-muted) focus:border-(--color-focus)'

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="border-t border-(--color-border) px-5 py-4">
            <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-(--color-text-muted)">{title}</h3>
                {action}
            </div>
            {children}
        </section>
    )
}

/**
 * The Team Details body: header + Overview/Members/Projects/Actions. Rendered
 * both inline (persistent desktop pane) and inside the overlay drawer on smaller
 * screens. The overlay chrome (backdrop, dialog role, click-outside/Escape) lives
 * in TeamDetailsDrawer; passing `onClose` shows the header close button.
 */
export default function TeamDetailsPanel({
    teamId,
    onClose,
    onChanged,
    onDeleted,
}: {
    teamId: string
    onClose?: () => void
    onChanged: (team: Team) => void
    onDeleted: (id: string) => void
}) {
    const [team, setTeam] = useState<Team | null>(null)
    const [projects, setProjects] = useState<PipelineCard[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [editing, setEditing] = useState(false)
    const [editName, setEditName] = useState('')
    const [editDescription, setEditDescription] = useState('')
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member')
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        let active = true
        Promise.all([teamsApi.get(teamId), teamsApi.pipelines().catch(() => [])])
            .then(([detail, pipelines]) => {
                if (!active) return
                setTeam(detail)
                setEditName(detail.name)
                setEditDescription(detail.description ?? '')
                setProjects(pipelines)
            })
            .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Could not load team') })
            .finally(() => { if (active) setLoading(false) })
        return () => { active = false }
    }, [teamId])

    async function refresh() {
        const detail = await teamsApi.get(teamId)
        setTeam(detail)
        onChanged(detail)
    }

    async function run(action: () => Promise<unknown>) {
        setBusy(true)
        setError(null)
        try {
            await action()
            await refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setBusy(false)
        }
    }

    const canManage = team?.role === 'owner' || team?.role === 'admin'
    const isOwner = team?.role === 'owner'
    const grouped = groupMembers(team?.members ?? [])
    const assigned = projects.filter(p => p.teamId === teamId)
    const assignable = projects.filter(p => p.teamId == null)

    async function saveEdit() {
        if (!editName.trim()) return
        await run(async () => { await teamsApi.update(teamId, editName.trim(), editDescription.trim() || null); setEditing(false) })
    }

    return (
        <div className="flex h-full flex-col overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                    <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-(--color-button) text-base font-semibold text-(--color-on-button)">{teamInitial(team?.name ?? '')}</span>
                    <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold text-(--color-text)">{team?.name ?? 'Team'}</h2>
                        <p className="text-xs text-(--color-text-muted)">Created {formatTeamDate(team?.createdAt ?? null)}</p>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    {canManage && !editing && (
                        <button type="button" aria-label="Edit team" onClick={() => setEditing(true)} className="rounded-md p-1.5 text-(--color-text-muted) hover:bg-(--color-bg) hover:text-(--color-text)">
                            <Pencil aria-hidden className="h-4 w-4" />
                        </button>
                    )}
                    {onClose && (
                        <button type="button" aria-label="Close" onClick={onClose} className="rounded-md p-1.5 text-(--color-text-muted) hover:bg-(--color-bg) hover:text-(--color-text)">
                            <X aria-hidden className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <p className="px-5 py-6 text-sm text-(--color-text-muted)">Loading team…</p>
            ) : !team ? (
                <p className="px-5 py-6 text-sm text-(--color-error)">{error ?? 'Team not found.'}</p>
            ) : (
                <>
                    {error && <p role="alert" className="px-5 pb-2 text-xs text-(--color-error)">{error}</p>}

                    {/* Overview */}
                    <Section title="Overview">
                        {editing ? (
                            <div className="flex flex-col gap-2">
                                <input value={editName} onChange={e => setEditName(e.target.value)} aria-label="Team name" className={inputClass} />
                                <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={2} aria-label="Team description" placeholder="Description" className={`${inputClass} resize-none`} />
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                                    <Button type="button" variant="primary" size="sm" onClick={saveEdit} disabled={busy || !editName.trim()}>Save</Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <p className="text-sm text-(--color-text)">{team.description || <span className="text-(--color-text-muted)">No description.</span>}</p>
                                <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
                                    <div><dt className="text-xs text-(--color-text-muted)">Owner</dt><dd className="truncate text-(--color-text)">{grouped.owner ? memberDisplayName(grouped.owner) : '—'}</dd></div>
                                    <div><dt className="text-xs text-(--color-text-muted)">Members</dt><dd className="text-(--color-text)">{grouped.active.length + 1}</dd></div>
                                    <div><dt className="text-xs text-(--color-text-muted)">Projects</dt><dd className="text-(--color-text)">{assigned.length}</dd></div>
                                </dl>
                            </>
                        )}
                    </Section>

                    {/* Members */}
                    <Section title="Members">
                        <ul className="flex flex-col gap-2">
                            {grouped.owner && <MemberRow member={grouped.owner} canManage={false} isOwner={isOwner} busy={busy} onRun={run} teamId={teamId} />}
                            {grouped.active.map(member => (
                                <MemberRow key={member.id} member={member} canManage={!!canManage} isOwner={isOwner} busy={busy} onRun={run} teamId={teamId} />
                            ))}
                        </ul>
                        {canManage && (
                            <div className="mt-3 flex items-center gap-2">
                                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="name@company.com" aria-label="Invite email" className={`${inputClass} flex-1`} />
                                <select value={inviteRole} onChange={e => setInviteRole(e.target.value as 'member' | 'admin')} aria-label="Invite role" className="rounded-md border border-(--color-border) bg-(--color-card) py-2 pl-2 pr-8 text-sm text-(--color-text) focus:border-(--color-focus)">
                                    <option value="member">Member</option>
                                    <option value="admin">Admin</option>
                                </select>
                                <Button type="button" size="sm" variant="secondary" disabled={busy || !inviteEmail.trim()} onClick={() => run(async () => { await teamsApi.invite(teamId, inviteEmail.trim(), inviteRole); setInviteEmail('') })}>
                                    Add
                                </Button>
                            </div>
                        )}
                    </Section>

                    {/* Pending invites */}
                    {grouped.pending.length > 0 && (
                        <Section title="Pending invites">
                            <ul className="flex flex-col gap-2">
                                {grouped.pending.map(member => (
                                    <li key={member.id} className="flex items-center gap-2 text-sm">
                                        <UserAvatar name={memberDisplayName(member)} size="sm" />
                                        <span className="min-w-0 flex-1 truncate text-(--color-text)">{member.email ?? memberDisplayName(member)}</span>
                                        <Chip label="Invited" tone="warning" />
                                        {canManage && <button type="button" className="text-xs font-medium text-(--color-link) hover:text-(--color-link-hover)" disabled={busy} onClick={() => run(() => teamsApi.resendInvite(teamId, member.id))}>Resend</button>}
                                        {canManage && <button type="button" aria-label={`Revoke invite for ${member.email ?? 'member'}`} className="rounded-md p-1 text-(--color-text-muted) hover:text-(--color-error)" disabled={busy} onClick={() => run(() => teamsApi.removeMember(teamId, member.id))}><X aria-hidden className="h-3.5 w-3.5" /></button>}
                                    </li>
                                ))}
                            </ul>
                        </Section>
                    )}

                    {/* Assigned projects */}
                    <Section title="Assigned projects">
                        {assigned.length === 0 ? (
                            <p className="text-sm text-(--color-text-muted)">No projects assigned to this team.</p>
                        ) : (
                            <ul className="flex flex-col gap-2">
                                {assigned.map(project => (
                                    <li key={project.id} className="flex items-center gap-2 text-sm">
                                        <span className="min-w-0 flex-1 truncate text-(--color-text)">{project.displayName || project.name}</span>
                                        {project.stage && <Chip label={project.stage} tone="muted" />}
                                        {canManage && <button type="button" className="text-xs text-(--color-text-muted) hover:text-(--color-error)" disabled={busy} onClick={() => run(async () => { await teamsApi.assignProject(project.id, null); setProjects(await teamsApi.pipelines()) })}>Unassign</button>}
                                    </li>
                                ))}
                            </ul>
                        )}
                        {canManage && assignable.length > 0 && (
                            <select
                                aria-label="Assign a project"
                                value=""
                                disabled={busy}
                                onChange={e => { const id = e.target.value; if (id) run(async () => { await teamsApi.assignProject(id, teamId); setProjects(await teamsApi.pipelines()) }) }}
                                className="mt-3 w-full rounded-md border border-(--color-border) bg-(--color-card) py-2 pl-3 pr-8 text-sm text-(--color-text) focus:border-(--color-focus)"
                            >
                                <option value="">Assign a project…</option>
                                {assignable.map(project => <option key={project.id} value={project.id}>{project.displayName || project.name}</option>)}
                            </select>
                        )}
                    </Section>

                    {/* Actions */}
                    {isOwner && (
                        <Section title="Actions">
                            {confirmDelete ? (
                                <div className="rounded-md border border-(--color-error) bg-(--color-error-soft) p-3">
                                    <p className="text-sm text-(--color-text)">Delete “{team.name}”? This cannot be undone.</p>
                                    <div className="mt-3 flex justify-end gap-2">
                                        <Button type="button" size="sm" variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                                        <Button type="button" size="sm" variant="danger" disabled={busy} onClick={() => run(async () => { await teamsApi.remove(teamId); onDeleted(teamId) })}>Delete team</Button>
                                    </div>
                                </div>
                            ) : (
                                <button type="button" onClick={() => setConfirmDelete(true)} className="w-full rounded-md border border-(--color-error) px-3 py-2 text-left text-sm font-medium text-(--color-error) transition-colors hover:bg-(--color-error-soft)">
                                    Delete team
                                </button>
                            )}
                        </Section>
                    )}
                </>
            )}
        </div>
    )
}

function MemberRow({ member, canManage, isOwner, busy, onRun, teamId }: {
    member: TeamMember
    canManage: boolean
    isOwner: boolean
    busy: boolean
    onRun: (action: () => Promise<unknown>) => void
    teamId: string
}) {
    const isTeamOwner = member.role === 'owner'
    // Removing a member is destructive, so the trash affordance asks for a
    // second click to confirm rather than removing on the first.
    const [confirming, setConfirming] = useState(false)
    return (
        <li className="flex items-center gap-2 text-sm">
            <UserAvatar name={memberDisplayName(member)} size="sm" />
            <span className="min-w-0 flex-1 truncate text-(--color-text)">{memberDisplayName(member)}</span>
            {canManage && !isTeamOwner ? (
                <select
                    value={member.role}
                    aria-label={`Role for ${memberDisplayName(member)}`}
                    disabled={busy}
                    onChange={e => onRun(() => teamsApi.setMemberRole(teamId, member.id, e.target.value as TeamRole))}
                    className="rounded-md border border-(--color-border) bg-(--color-card) py-1 pl-1.5 pr-7 text-xs text-(--color-text)"
                >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    {isOwner && <option value="owner">Owner (transfer)</option>}
                </select>
            ) : (
                <Chip label={ROLE_LABELS[member.role]} tone={isTeamOwner ? 'success' : 'neutral'} />
            )}
            {canManage && !isTeamOwner && (
                confirming ? (
                    <span className="flex items-center gap-1.5 text-xs">
                        <button type="button" disabled={busy} onClick={() => { setConfirming(false); onRun(() => teamsApi.removeMember(teamId, member.id)) }} className="font-semibold text-(--color-error) hover:opacity-70">Remove</button>
                        <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="text-(--color-text-muted) hover:text-(--color-text)">Cancel</button>
                    </span>
                ) : (
                    <button type="button" aria-label={`Remove ${memberDisplayName(member)}`} className="rounded-md p-1 text-(--color-text-muted) hover:text-(--color-error)" disabled={busy} onClick={() => setConfirming(true)}>
                        <X aria-hidden className="h-3.5 w-3.5" />
                    </button>
                )
            )}
        </li>
    )
}
