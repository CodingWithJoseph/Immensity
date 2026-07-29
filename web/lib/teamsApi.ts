import type { Team, TeamMember, TeamRole } from '@/lib/types/team'
import type { ApiData } from '@/lib/fetchJson'
import type { PipelineCard } from '@/lib/types/cluster'

type ApiList<T> = { data: T[] }

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, init)
    const text = await res.text()
    const body = text ? JSON.parse(text) : {}
    if (!res.ok) {
        const detail = (body as { detail?: unknown })?.detail
        const message = typeof detail === 'string' ? detail : (body as { error?: string })?.error || 'Request failed'
        throw new Error(message)
    }
    return body as T
}

const json = (payload: unknown): RequestInit => ({
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
})

export const teamsApi = {
    list: () => requestJson<ApiList<Team>>('/api/teams').then(r => r.data),
    get: (id: string) => requestJson<ApiData<Team>>(`/api/teams/${id}`).then(r => r.data),
    create: (name: string, description: string | null) =>
        requestJson<ApiData<Team>>('/api/teams', { method: 'POST', ...json({ name, description }) }).then(r => r.data),
    update: (id: string, name: string, description: string | null) =>
        requestJson<ApiData<Team>>(`/api/teams/${id}`, { method: 'PATCH', ...json({ name, description }) }).then(r => r.data),
    remove: (id: string) => requestJson(`/api/teams/${id}`, { method: 'DELETE' }),

    invite: (teamId: string, email: string, role: TeamRole) =>
        requestJson<ApiData<TeamMember>>(`/api/teams/${teamId}/members`, { method: 'POST', ...json({ email, role }) }).then(r => r.data),
    setMemberRole: (teamId: string, memberId: string, role: TeamRole) =>
        requestJson<ApiData<TeamMember>>(`/api/teams/${teamId}/members/${memberId}`, { method: 'PATCH', ...json({ role }) }).then(r => r.data),
    removeMember: (teamId: string, memberId: string) =>
        requestJson(`/api/teams/${teamId}/members/${memberId}`, { method: 'DELETE' }),
    resendInvite: (teamId: string, memberId: string) =>
        requestJson<ApiData<TeamMember>>(`/api/teams/${teamId}/members/${memberId}/resend`, { method: 'POST' }).then(r => r.data),

    pipelines: () => requestJson<ApiList<PipelineCard>>('/api/pipeline').then(r => r.data),
    assignProject: (pipelineId: string, teamId: string | null) =>
        requestJson<ApiData<PipelineCard>>(`/api/pipeline/${pipelineId}`, { method: 'PATCH', ...json({ team_id: teamId }) }).then(r => r.data),
}

// ── Derived, presentation-only helpers (pure, unit-tested) ────────────────────

export function teamInitial(name: string): string {
    return (name.trim()[0] || 'T').toUpperCase()
}

export function memberDisplayName(member: TeamMember): string {
    return member.displayName || member.email || (member.status === 'invited' ? 'Invited member' : 'Team member')
}

export function countActiveMembers(team: Team): number {
    const members = team.members ?? []
    if (members.length > 0) return members.filter(m => m.status !== 'removed').length
    // A team always has at least its owner even before members are expanded.
    return 1
}

// Split a team's members into owner / members / pending invites for the details view.
export function groupMembers(members: TeamMember[]): { owner: TeamMember | null; active: TeamMember[]; pending: TeamMember[] } {
    const live = members.filter(m => m.status !== 'removed')
    return {
        owner: live.find(m => m.role === 'owner') ?? null,
        active: live.filter(m => m.role !== 'owner' && m.status === 'active'),
        pending: live.filter(m => m.status === 'invited'),
    }
}

export function formatTeamDate(value: string | null): string {
    if (!value) return 'Unknown'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Unknown'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
