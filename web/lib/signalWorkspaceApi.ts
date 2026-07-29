import type {
    SignalCase,
    SignalConversation,
    SignalConversationSummary,
} from '@/app/(core)/dashboard/(discovery)/discover/signal/workspace/types'

export class SignalWorkspaceApiError extends Error {
    constructor(
        message: string,
        readonly status: number,
    ) {
        super(message)
        this.name = 'SignalWorkspaceApiError'
    }
}

async function signalRequest<T>(
    path: string,
    init?: RequestInit,
): Promise<T> {
    const response = await fetch(path, {
        ...init,
        headers: {
            ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
            ...init?.headers,
        },
    })
    const text = await response.text()
    let payload: unknown = null
    if (text) {
        try {
            payload = JSON.parse(text)
        } catch {
            payload = null
        }
    }
    if (!response.ok) {
        const detail = payload && typeof payload === 'object'
            ? ('detail' in payload ? String(payload.detail) : 'error' in payload ? String(payload.error) : null)
            : null
        throw new SignalWorkspaceApiError(
            detail || `Signal request failed (${response.status})`,
            response.status,
        )
    }
    return payload as T
}

function base(pipelineId: string): string {
    return `/api/pipeline/${encodeURIComponent(pipelineId)}/signal`
}

export function getSignalCase(pipelineId: string, signal?: AbortSignal): Promise<SignalCase> {
    return signalRequest(`${base(pipelineId)}/case`, { signal })
}

export function refreshSignalCase(pipelineId: string): Promise<SignalCase> {
    return signalRequest(`${base(pipelineId)}/case/refresh`, { method: 'POST' })
}

export function updateSignalOverride(
    pipelineId: string,
    objectKind: string,
    objectId: string,
    patch: Record<string, unknown>,
): Promise<SignalCase> {
    return signalRequest(
        `${base(pipelineId)}/case/overrides/${encodeURIComponent(objectKind)}/${encodeURIComponent(objectId)}`,
        {
            method: 'PATCH',
            body: JSON.stringify({ patch }),
        },
    )
}

export function listSignalConversations(
    pipelineId: string,
    includeArchived = false,
): Promise<SignalConversationSummary[]> {
    return signalRequest(
        `${base(pipelineId)}/conversations?include_archived=${includeArchived ? 'true' : 'false'}`,
    )
}

export function createSignalConversation(
    pipelineId: string,
    title?: string,
): Promise<SignalConversation> {
    return signalRequest(`${base(pipelineId)}/conversations`, {
        method: 'POST',
        body: JSON.stringify(title ? { title } : {}),
    })
}

export function getSignalConversation(
    pipelineId: string,
    conversationId: string,
): Promise<SignalConversation> {
    return signalRequest(
        `${base(pipelineId)}/conversations/${encodeURIComponent(conversationId)}`,
    )
}

export function updateSignalConversation(
    pipelineId: string,
    conversationId: string,
    update: { title?: string; archived?: boolean },
): Promise<SignalConversationSummary> {
    return signalRequest(
        `${base(pipelineId)}/conversations/${encodeURIComponent(conversationId)}`,
        {
            method: 'PATCH',
            body: JSON.stringify(update),
        },
    )
}

export function askSignal(
    pipelineId: string,
    conversationId: string,
    message: string,
): Promise<SignalConversation> {
    return signalRequest(
        `${base(pipelineId)}/conversations/${encodeURIComponent(conversationId)}/messages`,
        {
            method: 'POST',
            body: JSON.stringify({ message }),
        },
    )
}

export function decideSignalProposal(
    pipelineId: string,
    conversationId: string,
    proposalId: string,
    decision: 'accepted' | 'rejected',
): Promise<SignalConversation> {
    return signalRequest(
        `${base(pipelineId)}/conversations/${encodeURIComponent(conversationId)}/proposals/${encodeURIComponent(proposalId)}`,
        {
            method: 'PATCH',
            body: JSON.stringify({ status: decision }),
        },
    )
}

