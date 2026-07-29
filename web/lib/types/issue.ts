export type IssueStatus = 'open' | 'done' | 'archived'

export interface IssueComment {
    id: string
    issueId: string
    userId: string
    authorDisplayName: string
    body: string
    createdAt: string | null
    updatedAt: string | null
}

export interface IssueProject {
    id: string
    name: string
    stage: string
}

export interface IssueTeam {
    id: string
    name: string
    description: string | null
}

export interface IssueAssignee {
    id: string
    teamId: string
    userId: string | null
    email: string | null
    displayName: string | null
    role: 'owner' | 'admin' | 'member'
    status: 'active' | 'invited' | 'removed'
}

export interface Issue {
    id: string
    userId: string
    teamId: string | null
    assigneeId: string | null
    assignee: IssueAssignee | null
    pipelineId: string | null
    project: IssueProject | null
    team: IssueTeam | null
    parentIssueId: string | null
    title: string
    summary: string | null
    status: IssueStatus
    issueType: 'issue' | 'kill_criteria'
    position: number
    source: string | null
    commentCount: number
    subIssueCount: number
    createdAt: string | null
    updatedAt: string | null
    closedAt: string | null
}

export interface IssueDetail extends Issue {
    parentIssue?: Pick<Issue, 'id' | 'title'> | null
    comments: IssueComment[]
    subIssues: Issue[]
}
