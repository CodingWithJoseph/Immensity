'use client'

import { Check, ExternalLink, X } from 'lucide-react'
import type { SignalProposal } from '../types'

export interface ConversationProposalCardProps {
    proposal: SignalProposal
    disabled?: boolean
    onAccept: (proposalId: string) => void
    onReject: (proposalId: string) => void
    onOpenEvidence: (evidenceId: string) => void
}

export default function ConversationProposalCard({
    proposal,
    disabled = false,
    onAccept,
    onReject,
    onOpenEvidence,
}: ConversationProposalCardProps) {
    const resolved = proposal.status !== 'pending'

    return (
        <section
            aria-label={`Proposed change: ${proposal.title}`}
            className="mt-4 rounded-lg border border-(--color-border) bg-(--color-surface) p-4"
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-(--color-text-muted)">
                        Proposed change
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-(--color-text)">{proposal.title}</h3>
                </div>
                {resolved && (
                    <span
                        className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                            proposal.status === 'accepted'
                                ? 'bg-(--color-success-soft) text-(--color-success)'
                                : 'bg-(--color-surface-tint) text-(--color-text-muted)'
                        }`}
                    >
                        {proposal.status === 'accepted' ? 'Accepted' : 'Rejected'}
                    </span>
                )}
            </div>

            <p className="mt-3 text-sm leading-6 text-(--color-text-muted)">{proposal.summary}</p>

            {proposal.evidenceIds.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2" aria-label="Proposal evidence">
                    {proposal.evidenceIds.map((evidenceId, index) => (
                        <button
                            key={evidenceId}
                            type="button"
                            onClick={() => onOpenEvidence(evidenceId)}
                            className="inline-flex items-center gap-1 rounded-md border border-(--color-border) px-2 py-1 text-xs text-(--color-text-muted) hover:bg-(--color-surface-tint) hover:text-(--color-text)"
                        >
                            Evidence {index + 1}
                            <ExternalLink size={12} aria-hidden />
                        </button>
                    ))}
                </div>
            )}

            {!resolved && (
                <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-(--color-border) pt-3">
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onReject(proposal.id)}
                        className="inline-flex min-h-9 items-center gap-2 rounded-md border border-(--color-border) px-3 py-2 text-xs font-medium text-(--color-text-muted) hover:bg-(--color-surface-tint) hover:text-(--color-text) disabled:cursor-wait disabled:opacity-50"
                    >
                        <X size={14} aria-hidden />
                        Reject
                    </button>
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onAccept(proposal.id)}
                        className="inline-flex min-h-9 items-center gap-2 rounded-md border border-(--color-button) bg-(--color-button) px-3 py-2 text-xs font-medium text-(--color-on-button) hover:border-(--color-button-hover) hover:bg-(--color-button-hover) disabled:cursor-wait disabled:opacity-50"
                    >
                        <Check size={14} aria-hidden />
                        Accept
                    </button>
                </div>
            )}
        </section>
    )
}
