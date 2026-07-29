export type TeamRole = 'owner' | 'admin' | 'member'
export type TeamMemberStatus = 'active' | 'invited' | 'removed'

export interface TeamMember {
    id: string
    teamId: string
    userId: string | null
    email: string | null
    displayName: string | null
    role: TeamRole
    status: TeamMemberStatus
    invitedAt?: string | null
    // Present only for pending invites and only for owners/admins.
    inviteUrl?: string | null
    createdAt: string | null
    updatedAt: string | null
}

export interface Team {
    id: string
    ownerUserId: string
    name: string
    description: string | null
    role: TeamRole | null
    members?: TeamMember[]
    createdAt: string | null
    updatedAt: string | null
}
