'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MoreVertical, Users } from 'lucide-react'
import { Button } from '@/app/(core)/dashboard/components/Button'
import UserAvatar from '@/app/(core)/dashboard/components/UserAvatar'
import CreateTeamModal from './CreateTeamModal'
import TeamDetailsDrawer from './TeamDetailsDrawer'
import TeamDetailsPanel from './TeamDetailsPanel'
import { teamsApi, teamInitial, countActiveMembers, formatTeamDate, memberDisplayName } from '@/lib/teamsApi'
import { useIsDesktop } from '@/lib/useIsDesktop'
import type { Team } from '@/lib/types/team'

// Default selection: most recently created team first. No "default team" concept
// exists in the data model, so createdAt (tiebroken by id) is the deterministic order.
function byNewest(a: Team, b: Team): number {
    const created = (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
    return created !== 0 ? created : a.id.localeCompare(b.id)
}

export default function TeamsPage() {
    const [teams, setTeams] = useState<Team[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [creating, setCreating] = useState(false)
    // Team whose detail is shown. On desktop this drives the persistent pane and
    // falls back to the newest team when unset; on mobile it's set by tapping a card.
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
    // Whether the small-screen overlay drawer is open (desktop uses the inline pane).
    const [mobileOpen, setMobileOpen] = useState(false)
    const isDesktop = useIsDesktop()

    async function reload() {
        try {
            setTeams(await teamsApi.list())
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load teams')
        }
    }

    useEffect(() => {
        let active = true
        teamsApi.list()
            .then(list => { if (active) setTeams(list) })
            .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Could not load teams') })
            .finally(() => { if (active) setLoading(false) })
        return () => { active = false }
    }, [])

    const sortedTeams = useMemo(() => [...teams].sort(byNewest), [teams])
    // Derived (not stored) so the newest team is auto-selected on desktop without
    // an effect; an explicit tap sets selectedTeamId and takes precedence.
    const explicitSelected = selectedTeamId && teams.some(t => t.id === selectedTeamId) ? selectedTeamId : null
    const paneTeamId = explicitSelected ?? sortedTeams[0]?.id ?? null
    const paneTeam = teams.find(t => t.id === paneTeamId) ?? null

    function openTeam(id: string) {
        setSelectedTeamId(id)
        setMobileOpen(true)
    }

    function onChanged(updated: Team) {
        setTeams(current => current.map(t => (t.id === updated.id ? { ...t, ...updated } : t)))
    }

    function onDeleted(id: string) {
        setTeams(current => current.filter(t => t.id !== id))
        setSelectedTeamId(null)
        setMobileOpen(false)
    }

    return (
        <div className="flex w-full flex-col gap-6 px-6 py-6 lg:h-[calc(100vh-4rem)] lg:overflow-hidden">
            <header className="shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-xl font-semibold text-(--color-text)">Teams</h1>
                    <Button type="button" variant="primary" onClick={() => setCreating(true)}>Create team</Button>
                </div>
                <p className="mt-1 text-sm text-(--color-text-muted)">Manage your teams and members.</p>
            </header>

            {error && <p role="alert" className="shrink-0 text-sm text-(--color-error)">{error}</p>}

            {loading ? (
                <p className="text-sm text-(--color-text-muted)">Loading teams…</p>
            ) : teams.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-(--color-border) bg-(--color-card) px-6 py-16 text-center">
                    <span aria-hidden className="grid h-12 w-12 place-items-center rounded-full bg-(--color-bg) text-(--color-text-muted)"><Users className="h-6 w-6" /></span>
                    <p className="mt-4 text-sm font-semibold text-(--color-text)">No teams yet</p>
                    <p className="mt-1 max-w-sm text-sm text-(--color-text-muted)">Create a team to collaborate with others and share projects.</p>
                    <Button type="button" variant="primary" className="mt-4" onClick={() => setCreating(true)}>Create team</Button>
                </div>
            ) : (
                <div className="lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-6 lg:overflow-hidden">
                    {/* Master list — the wider pane (~55%), two columns of cards */}
                    <div className="lg:min-h-0 lg:overflow-y-auto">
                        <div className="grid gap-5 sm:grid-cols-2">
                            {sortedTeams.map(team => (
                                <TeamCard
                                    key={team.id}
                                    team={team}
                                    selected={isDesktop && team.id === paneTeamId}
                                    onOpen={() => openTeam(team.id)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Detail pane — persistent on desktop only */}
                    {isDesktop && paneTeamId && (
                        <div className="hidden rounded-md border border-(--color-border) bg-(--color-card) lg:flex lg:min-h-0 lg:flex-col lg:overflow-hidden">
                            <TeamDetailsPanel key={paneTeamId} teamId={paneTeamId} onChanged={onChanged} onDeleted={onDeleted} />
                        </div>
                    )}
                </div>
            )}

            {creating && (
                <CreateTeamModal
                    onClose={() => { setCreating(false); void reload() }}
                    onCreated={team => setTeams(current => [team, ...current])}
                />
            )}

            {/* Overlay drawer — small screens only */}
            {!isDesktop && mobileOpen && selectedTeamId && (
                <TeamDetailsDrawer
                    key={selectedTeamId}
                    teamId={selectedTeamId}
                    teamName={paneTeam?.name}
                    onClose={() => setMobileOpen(false)}
                    onChanged={onChanged}
                    onDeleted={onDeleted}
                />
            )}
        </div>
    )
}

function TeamCard({ team, selected, onOpen }: { team: Team; selected: boolean; onOpen: () => void }) {
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!menuOpen) return
        const onDown = (event: MouseEvent) => { if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false) }
        document.addEventListener('mousedown', onDown)
        return () => document.removeEventListener('mousedown', onDown)
    }, [menuOpen])

    const members = (team.members ?? []).filter(m => m.status !== 'removed')
    const memberCount = countActiveMembers(team)
    const avatars = members.slice(0, 4)

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen() } }}
            aria-pressed={selected}
            className={`flex cursor-pointer flex-col gap-4 rounded-md border bg-(--color-card) p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--color-focus) ${selected ? 'border-(--color-text-muted)' : 'border-(--color-border) hover:border-(--color-text-muted)'}`}
        >
            <div className="flex items-start justify-between gap-2">
                <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-(--color-button) text-sm font-semibold text-(--color-on-button)">{teamInitial(team.name)}</span>
                <div ref={menuRef} className="relative shrink-0">
                    <button
                        type="button"
                        aria-label="Team actions"
                        aria-expanded={menuOpen}
                        onClick={event => { event.stopPropagation(); setMenuOpen(open => !open) }}
                        className="rounded-md p-1 text-(--color-text-muted) hover:bg-(--color-bg) hover:text-(--color-text)"
                    >
                        <MoreVertical aria-hidden className="h-4 w-4" />
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 z-10 mt-1 w-40 rounded-md border border-(--color-border) bg-(--color-card) py-1 shadow-lg">
                            <button type="button" onClick={event => { event.stopPropagation(); setMenuOpen(false); onOpen() }} className="block w-full px-3 py-1.5 text-left text-sm text-(--color-text) hover:bg-(--color-bg)">View details</button>
                            <button type="button" onClick={event => { event.stopPropagation(); setMenuOpen(false); onOpen() }} className="block w-full px-3 py-1.5 text-left text-sm text-(--color-text) hover:bg-(--color-bg)">Invite members</button>
                        </div>
                    )}
                </div>
            </div>

            <div>
                <h2 className="min-w-0 truncate text-sm font-semibold text-(--color-text)" title={team.name}>{team.name}</h2>
                <p className="mt-0.5 text-xs text-(--color-text-muted)">Created {formatTeamDate(team.createdAt)}</p>
            </div>

            <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                <div className="flex -space-x-2">
                    {avatars.length > 0
                        ? avatars.map(member => <UserAvatar key={member.id} name={memberDisplayName(member)} size="xs" />)
                        : <UserAvatar name={team.name} size="xs" />}
                </div>
                <span className="text-xs text-(--color-text-muted)">{memberCount} member{memberCount === 1 ? '' : 's'}</span>
            </div>
        </div>
    )
}
