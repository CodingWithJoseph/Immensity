import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth-guard'
import { forwardJson, getToken } from '@/lib/apiProxy'

const API_URL = process.env.NEXT_PUBLIC_API_URL

function backendIssuesUrl(request: NextRequest) {
    const source = new URL(request.url)
    const target = new URL(`${API_URL}/issues`)
    for (const [key, value] of source.searchParams.entries()) {
        if (key === 'pipelineId') target.searchParams.set('pipeline_id', value)
        else if (key === 'teamId') target.searchParams.set('team_id', value)
        else if (key === 'parentIssueId') target.searchParams.set('parent_issue_id', value)
        else if (key === 'issueType') target.searchParams.set('issue_type', value)
        else target.searchParams.set(key, value)
    }
    return target
}

export async function GET(request: NextRequest) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error

    const token = getToken(request)
    const res = await fetch(backendIssuesUrl(request), {
        headers: { Authorization: `Bearer ${token}` },
    })
    return forwardJson(res, 'Failed to fetch issues')
}

export async function POST(request: NextRequest) {
    const { user, error } = await verifyAuth(request)
    if (!user) return error

    const token = getToken(request)
    const body = await request.json()
    const res = await fetch(`${API_URL}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
    })
    return forwardJson(res, 'Failed to create issue')
}
