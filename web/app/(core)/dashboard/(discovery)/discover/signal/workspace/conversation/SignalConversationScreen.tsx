'use client'

import Image from 'next/image'
import {
    Archive,
    ArrowUp,
    ChevronDown,
    Database,
    ExternalLink,
    LoaderCircle,
    MessageSquarePlus,
    X,
} from 'lucide-react'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import type {
    SignalCase,
    SignalConversation,
    SignalConversationSummary,
    SignalConversationTurn,
} from '../types'
import ConversationProposalCard from './ConversationProposalCard'

export interface SignalConversationContext {
    kind: 'case' | 'thesis' | 'problem_unit' | 'audience' | 'claim' | 'assumption'
    id: string | null
    label: string
}

export interface SignalConversationScreenProps {
    caseData: SignalCase
    conversation: SignalConversation | null
    conversations: SignalConversationSummary[]
    context?: SignalConversationContext | null
    pending?: boolean
    pendingProposalId?: string | null
    error?: string | null
    onSubmit: (message: string) => void
    onNewConversation: () => void
    onSelectConversation: (conversationId: string) => void
    onArchiveConversation: (conversationId: string) => void
    onOpenEvidence: (evidenceId: string) => void
    onAcceptProposal: (proposalId: string) => void
    onRejectProposal: (proposalId: string) => void
    onClearContext: () => void
}

function formatActivity(value: string): string {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Recently'
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
    }).format(date)
}

function Turn({
    turn,
    pendingProposalId,
    onOpenEvidence,
    onAcceptProposal,
    onRejectProposal,
}: {
    turn: SignalConversationTurn
    pendingProposalId: string | null
    onOpenEvidence: (evidenceId: string) => void
    onAcceptProposal: (proposalId: string) => void
    onRejectProposal: (proposalId: string) => void
}) {
    if (turn.role === 'user') {
        return (
            <article className="flex justify-end" aria-label="Your message">
                                <div className="max-w-[min(80%,44rem)] rounded-lg bg-(--color-button) px-4 py-3 text-sm leading-6 text-(--color-on-button) hover:bg-(--color-button-hover)">
                    {turn.text}
                </div>
            </article>
        )
    }

    return (
        <article className="flex items-start gap-3" aria-label="Signal response">
            <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-(--color-accent-soft)">
                <Image src="/brand/logo_orange.svg" alt="" width={18} height={18} aria-hidden />
            </div>
            <div className="min-w-0 max-w-3xl flex-1">
                <div className="text-sm leading-7 text-(--color-text) whitespace-pre-wrap">{turn.text}</div>

                {turn.insufficientEvidence && (
                    <div className="mt-3 rounded-md border border-(--color-warning) bg-(--color-warning-soft) px-3 py-2 text-xs leading-5 text-(--color-text)">
                        The current project evidence is not strong enough to answer this conclusively.
                    </div>
                )}

                {turn.citations.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2" aria-label="Response citations">
                        {turn.citations.map(citation => (
                            <button
                                key={`${turn.id}-${citation.evidenceId}`}
                                type="button"
                                onClick={() => onOpenEvidence(citation.evidenceId)}
                                className="inline-flex items-center gap-1.5 rounded-md border border-(--color-border) bg-(--color-surface) px-2.5 py-1.5 text-xs text-(--color-text-muted) hover:bg-(--color-surface-tint) hover:text-(--color-text)"
                            >
                                <Database size={13} className="text-(--color-accent)" aria-hidden />
                                {citation.label}
                                <ExternalLink size={11} aria-hidden />
                            </button>
                        ))}
                    </div>
                )}

                {turn.proposal && (
                    <ConversationProposalCard
                        proposal={turn.proposal}
                        disabled={pendingProposalId === turn.proposal.id}
                        onAccept={onAcceptProposal}
                        onReject={onRejectProposal}
                        onOpenEvidence={onOpenEvidence}
                    />
                )}
            </div>
        </article>
    )
}

function EmptyConversation({
    caseData,
    onSuggestion,
}: {
    caseData: SignalCase
    onSuggestion: (message: string) => void
}) {
    const suggestions = useMemo(() => {
        const unit = caseData.problemUnits.find(item => item.pinned && !item.rejected)
            ?? caseData.problemUnits.find(item => !item.rejected)
        return [
            'Show me the strongest evidence for the problem thesis.',
            unit ? `What evidence contradicts “${unit.title}”?` : 'What evidence contradicts the current problem framing?',
            'Which assumption has the weakest support?',
            'What should I validate first?',
        ]
    }, [caseData.problemUnits])

    return (
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-10 text-center">
            <Image src="/brand/logo_orange.svg" alt="" width={34} height={34} aria-hidden />
            <h2 className="mt-5 text-xl font-semibold text-(--color-text)">Ask Signal about this problem</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-(--color-text-muted)">
                Answers are grounded in this project&apos;s Opportunity Case and source evidence. Signal will say when the evidence is insufficient.
            </p>
            <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
                {suggestions.map(suggestion => (
                    <button
                        key={suggestion}
                        type="button"
                        onClick={() => onSuggestion(suggestion)}
                        className="rounded-lg border border-(--color-border) bg-(--color-surface) px-4 py-3 text-left text-sm leading-5 text-(--color-text-muted) hover:bg-(--color-surface-tint) hover:text-(--color-text)"
                    >
                        {suggestion}
                    </button>
                ))}
            </div>
        </div>
    )
}

export default function SignalConversationScreen({
    caseData,
    conversation,
    conversations,
    context = null,
    pending = false,
    pendingProposalId = null,
    error = null,
    onSubmit,
    onNewConversation,
    onSelectConversation,
    onArchiveConversation,
    onOpenEvidence,
    onAcceptProposal,
    onRejectProposal,
    onClearContext,
}: SignalConversationScreenProps) {
    const [input, setInput] = useState('')
    const [historyOpen, setHistoryOpen] = useState(false)
    const endRef = useRef<HTMLDivElement>(null)
    const canAsk = caseData.evidence.length > 0 && !pending

    useEffect(() => {
        if (typeof endRef.current?.scrollIntoView === 'function') {
            endRef.current.scrollIntoView({ block: 'end' })
        }
    }, [conversation?.turns.length, pending])

    const submit = (event: FormEvent) => {
        event.preventDefault()
        const message = input.trim()
        if (!message || !canAsk) return
        onSubmit(message)
        setInput('')
    }

    const currentTitle = conversation?.title ?? 'New conversation'

    return (
        <section className="flex min-h-0 flex-1 flex-col bg-(--color-bg)" aria-label="Ask Signal">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-(--color-border) px-4 py-3 sm:px-6">
                <div className="relative min-w-0">
                    <button
                        type="button"
                        onClick={() => setHistoryOpen(value => !value)}
                        aria-expanded={historyOpen}
                        className="inline-flex max-w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-(--color-surface-tint)"
                    >
                        <span className="truncate text-sm font-semibold text-(--color-text)">{currentTitle}</span>
                        <ChevronDown size={15} className="shrink-0 text-(--color-text-muted)" aria-hidden />
                    </button>

                    {historyOpen && (
                        <div className="absolute left-0 top-full z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-(--color-border) bg-(--color-surface) p-2 shadow-xl">
                            <button
                                type="button"
                                onClick={() => {
                                    onNewConversation()
                                    setHistoryOpen(false)
                                }}
                                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-(--color-text) hover:bg-(--color-surface-tint)"
                            >
                                <MessageSquarePlus size={16} aria-hidden />
                                New conversation
                            </button>
                            {conversations.length > 0 && <div className="my-2 border-t border-(--color-border)" />}
                            <ul className="max-h-72 overflow-y-auto">
                                {conversations.map(item => (
                                    <li key={item.id} className="group flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onSelectConversation(item.id)
                                                setHistoryOpen(false)
                                            }}
                                            className={`min-w-0 flex-1 rounded-md px-3 py-2 text-left ${
                                                item.id === conversation?.id
                                                    ? 'bg-(--color-surface-tint)'
                                                    : 'hover:bg-(--color-surface-tint)'
                                            }`}
                                        >
                                            <span className="block truncate text-sm text-(--color-text)">{item.title}</span>
                                            <span className="mt-0.5 block text-[11px] text-(--color-text-muted)">
                                                {formatActivity(item.updatedAt)}
                                            </span>
                                        </button>
                                        {!item.archived && (
                                            <button
                                                type="button"
                                                onClick={() => onArchiveConversation(item.id)}
                                                aria-label={`Archive ${item.title}`}
                                                title="Archive"
                                                className="rounded-md p-2 text-(--color-text-muted) opacity-0 hover:bg-(--color-surface-tint) hover:text-(--color-text) group-hover:opacity-100 focus:opacity-100"
                                            >
                                                <Archive size={14} aria-hidden />
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={onNewConversation}
                    className="inline-flex min-h-9 items-center gap-2 rounded-md border border-(--color-border) px-3 py-2 text-xs font-medium text-(--color-text) hover:bg-(--color-surface-tint)"
                >
                    <MessageSquarePlus size={15} aria-hidden />
                    New
                </button>
            </header>

            {context && (
                <div className="flex items-center justify-between gap-3 border-b border-(--color-border) bg-(--color-surface) px-4 py-2 sm:px-6">
                    <p className="min-w-0 truncate text-xs text-(--color-text-muted)">
                        Context: <span className="font-medium text-(--color-text)">{context.label}</span>
                    </p>
                    <button
                        type="button"
                        onClick={onClearContext}
                        aria-label="Clear conversation context"
                        className="rounded-md p-1.5 text-(--color-text-muted) hover:bg-(--color-surface-tint) hover:text-(--color-text)"
                    >
                        <X size={14} aria-hidden />
                    </button>
                </div>
            )}

            {caseData.status === 'stale' && (
                <p className="border-b border-(--color-border) bg-(--color-warning-soft) px-4 py-2 text-xs text-(--color-text) sm:px-6">
                    This conversation uses the current saved case. New evidence is available; refresh the case from Overview when you are ready.
                </p>
            )}
            {(caseData.status === 'queued' || caseData.status === 'generating') && (
                <p className="border-b border-(--color-border) bg-(--color-blue-soft) px-4 py-2 text-xs text-(--color-text) sm:px-6">
                    The full Opportunity Case is still generating. Signal can answer from the evidence already available.
                </p>
            )}
            {caseData.status === 'insufficient_evidence' && (
                <p className="border-b border-(--color-border) bg-(--color-warning-soft) px-4 py-2 text-xs text-(--color-text) sm:px-6">
                    Evidence is limited. Answers may identify gaps rather than reach a conclusion.
                </p>
            )}
            {caseData.status === 'failed' && caseData.safeError && (
                <p role="alert" className="border-b border-(--color-border) bg-(--color-error-soft) px-4 py-2 text-xs text-(--color-error) sm:px-6">
                    {caseData.safeError}
                </p>
            )}
            {error && (
                <p role="alert" className="border-b border-(--color-border) bg-(--color-error-soft) px-4 py-2 text-xs text-(--color-error) sm:px-6">
                    {error}
                </p>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto">
                {!conversation || conversation.turns.length === 0 ? (
                    <EmptyConversation caseData={caseData} onSuggestion={message => setInput(message)} />
                ) : (
                    <div className="mx-auto flex w-full max-w-4xl flex-col gap-7 px-4 py-7 sm:px-6">
                        {conversation.turns.map(turn => (
                            <Turn
                                key={turn.id}
                                turn={turn}
                                pendingProposalId={pendingProposalId}
                                onOpenEvidence={onOpenEvidence}
                                onAcceptProposal={onAcceptProposal}
                                onRejectProposal={onRejectProposal}
                            />
                        ))}
                        {pending && (
                            <div className="flex items-center gap-3 text-sm text-(--color-text-muted)" role="status">
                                <div className="grid h-8 w-8 place-items-center rounded-md bg-(--color-accent-soft)">
                                    <Image src="/brand/logo_orange.svg" alt="" width={18} height={18} aria-hidden />
                                </div>
                                <LoaderCircle size={16} className="animate-spin" aria-hidden />
                                Checking the project evidence…
                            </div>
                        )}
                        <div ref={endRef} />
                    </div>
                )}
            </div>

            <footer className="shrink-0 border-t border-(--color-border) bg-(--color-bg) px-4 py-3 sm:px-6">
                <form onSubmit={submit} className="mx-auto w-full max-w-4xl">
                    <div className="rounded-lg border border-(--color-border-strong) bg-(--color-surface) p-3">
                        <textarea
                            rows={2}
                            value={input}
                            maxLength={4_000}
                            onChange={event => setInput(event.target.value)}
                            onKeyDown={event => {
                                if (event.key === 'Enter' && !event.shiftKey) {
                                    event.preventDefault()
                                    event.currentTarget.form?.requestSubmit()
                                }
                            }}
                            placeholder={caseData.evidence.length > 0 ? 'Ask about this problem…' : 'No project evidence is available yet'}
                            aria-label="Ask Signal"
                            disabled={caseData.evidence.length === 0}
                            className="max-h-40 min-h-14 w-full resize-none border-0 bg-transparent px-1 py-1 text-sm leading-6 text-(--color-text) outline-none placeholder:text-(--color-text-faint) disabled:cursor-not-allowed"
                        />
                        <div className="mt-2 flex items-center justify-between gap-3">
                            <p className="text-[11px] text-(--color-text-muted)">
                                Answers must cite this project&apos;s evidence.
                            </p>
                            <button
                                type="submit"
                                disabled={!input.trim() || !canAsk}
                                aria-label="Send message"
                                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-(--color-button) text-(--color-on-button) hover:bg-(--color-button-hover) disabled:cursor-not-allowed disabled:opacity-30"
                            >
                                {pending
                                    ? <LoaderCircle size={17} className="animate-spin" aria-hidden />
                                    : <ArrowUp size={17} aria-hidden />}
                            </button>
                        </div>
                    </div>
                </form>
            </footer>
        </section>
    )
}
