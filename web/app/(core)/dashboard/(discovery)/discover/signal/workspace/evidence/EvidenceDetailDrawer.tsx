'use client'

import {
    ArrowLeft,
    Bookmark,
    BookmarkCheck,
    Check,
    ExternalLink,
    FileText,
    Link2,
    MessageSquareText,
    Pin,
    PinOff,
    Quote,
    X,
} from 'lucide-react'
import {
    useEffect,
    useId,
    useRef,
    useState,
    type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import type {
    SignalCase,
    SignalEvidenceRecord,
    SignalEvidenceStance,
} from '../types'

export type EvidenceOverviewTarget =
    | { kind: 'thesis'; id: 'thesis' }
    | { kind: 'problem_unit'; id: string }
    | { kind: 'audience'; id: string }
    | { kind: 'alternative'; id: string }
    | { kind: 'assumption'; id: string }
    | { kind: 'claim'; id: string }

export interface EvidenceDetailDrawerProps {
    open: boolean
    evidence: SignalEvidenceRecord | null
    signalCase: SignalCase | null
    onClose: () => void
    onOpenOriginalSource?: (evidence: SignalEvidenceRecord) => void
    onPinChange?: (evidence: SignalEvidenceRecord, pinned: boolean) => void
    onMarkIrrelevant?: (evidence: SignalEvidenceRecord) => void
    onMarkContradictory?: (evidence: SignalEvidenceRecord) => void
    onAttachToClaim?: (evidence: SignalEvidenceRecord, claimId: string) => void
    onSaveUserNote?: (evidence: SignalEvidenceRecord, note: string) => void
    onNavigateToOverview?: (target: EvidenceOverviewTarget) => void
}

const STANCE_LABEL: Record<SignalEvidenceStance, string> = {
    supporting: 'Supporting',
    contradictory: 'Contradictory',
    ambiguous: 'Ambiguous',
    excluded: 'Excluded',
}

const STANCE_STYLE: Record<SignalEvidenceStance, string> = {
    supporting: 'border-(--color-success-text) bg-(--color-success-soft) text-(--color-success-text)',
    contradictory: 'border-(--color-error-text) bg-(--color-error-soft) text-(--color-error-text)',
    ambiguous: 'border-(--color-warning) bg-(--color-warning-soft) text-(--color-warning-text)',
    excluded: 'border-(--color-border-strong) bg-(--color-surface-tint) text-(--color-text-muted)',
}

const BUTTON =
    'inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-(--color-border) bg-(--color-surface) px-3 py-2 text-xs font-semibold text-(--color-text) transition-colors hover:bg-(--color-surface-tint) disabled:cursor-not-allowed disabled:opacity-45'

function formatDate(value: string | null): string {
    if (!value) return 'Date unavailable'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Date unavailable'
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    })
}

function sourceName(evidence: SignalEvidenceRecord): string {
    return [evidence.platform, evidence.community].filter(Boolean).join(' · ') || 'Source unavailable'
}

function MetadataItem({ label, value }: { label: string; value: string }) {
    return (
        <div className='min-w-0'>
            <dt className='text-[10px] font-semibold uppercase tracking-widest text-(--color-text-faint)'>
                {label}
            </dt>
            <dd className='mt-1 break-words text-xs text-(--color-text)'>{value}</dd>
        </div>
    )
}

function stopButtonKeyPropagation(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Enter' || event.key === ' ') event.stopPropagation()
}

type OpenEvidenceDetailDrawerProps = Omit<EvidenceDetailDrawerProps, 'evidence'> & {
    evidence: SignalEvidenceRecord
}

export default function EvidenceDetailDrawer(props: EvidenceDetailDrawerProps) {
    if (!props.open || !props.evidence) return null
    return <OpenEvidenceDetailDrawer key={props.evidence.id} {...props} evidence={props.evidence} />
}

function OpenEvidenceDetailDrawer({
    evidence,
    signalCase,
    onClose,
    onOpenOriginalSource,
    onPinChange,
    onMarkIrrelevant,
    onMarkContradictory,
    onAttachToClaim,
    onSaveUserNote,
    onNavigateToOverview,
}: OpenEvidenceDetailDrawerProps) {
    const headingId = useId()
    const descriptionId = useId()
    const drawerRef = useRef<HTMLDivElement>(null)
    const closeButtonRef = useRef<HTMLButtonElement>(null)
    const previousFocusRef = useRef<HTMLElement | null>(null)
    const onCloseRef = useRef(onClose)
    const [noteDraft, setNoteDraft] = useState(evidence.userNote ?? '')
    const [attachClaimId, setAttachClaimId] = useState('')

    useEffect(() => {
        onCloseRef.current = onClose
    }, [onClose])

    useEffect(() => {
        previousFocusRef.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        closeButtonRef.current?.focus()

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                event.preventDefault()
                onCloseRef.current()
                return
            }

            if (event.key !== 'Tab' || !drawerRef.current) return
            const focusable = Array.from(
                drawerRef.current.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
                ),
            ).filter(node => node.getAttribute('aria-hidden') !== 'true')

            if (focusable.length === 0) {
                event.preventDefault()
                return
            }

            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = previousOverflow
            previousFocusRef.current?.focus()
        }
    }, [])

    const connectedClaims =
        signalCase?.claims.filter(claim => evidence.claimIds.includes(claim.id)) ?? []
    const connectedProblemUnits =
        signalCase?.problemUnits.filter(unit => evidence.problemUnitIds.includes(unit.id)) ?? []
    const attachableClaims =
        signalCase?.claims.filter(claim => !evidence.claimIds.includes(claim.id) && !claim.rejected) ?? []
    const relatedOverviewTarget: EvidenceOverviewTarget | null = connectedProblemUnits[0]
        ? { kind: 'problem_unit', id: connectedProblemUnits[0].id }
        : connectedClaims[0]
            ? { kind: 'claim', id: connectedClaims[0].id }
            : null
    const body = evidence.body?.trim() || evidence.excerpt.trim()
    const usingExcerptFallback = !evidence.body?.trim()

    function navigate(target: EvidenceOverviewTarget) {
        onNavigateToOverview?.(target)
    }

    return (
        <div className='fixed inset-0 z-50'>
            <button
                type='button'
                className='absolute inset-0 cursor-default bg-black/35'
                aria-label='Close evidence details'
                onClick={onClose}
            />
            <div
                ref={drawerRef}
                role='dialog'
                aria-modal='true'
                aria-labelledby={headingId}
                aria-describedby={descriptionId}
                className='absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l border-(--color-border) bg-(--color-bg) shadow-2xl'
            >
                <header className='flex items-start justify-between gap-4 border-b border-(--color-border) bg-(--color-surface) px-5 py-4 sm:px-6'>
                    <div className='min-w-0'>
                        <p className='text-[10px] font-semibold uppercase tracking-[0.18em] text-(--color-text-faint)'>
                            Evidence detail
                        </p>
                        <h2 id={headingId} className='mt-1 text-lg font-semibold leading-snug text-(--color-text)'>
                            {evidence.title}
                        </h2>
                        <p id={descriptionId} className='mt-1 text-xs text-(--color-text-muted)'>
                            Original source material is separated from AI interpretation below.
                        </p>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type='button'
                        onClick={onClose}
                        className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-(--color-border) text-(--color-text-muted) transition-colors hover:bg-(--color-surface-tint) hover:text-(--color-text)'
                        aria-label='Close evidence details'
                    >
                        <X size={17} aria-hidden />
                    </button>
                </header>

                <div className='flex-1 overflow-y-auto'>
                    <section aria-labelledby={`${headingId}-source`} className='border-b border-(--color-border) bg-(--color-surface) px-5 py-6 sm:px-6'>
                        <div className='flex flex-wrap items-start justify-between gap-3'>
                            <div>
                                <p className='flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-(--color-text-faint)'>
                                    <FileText size={14} aria-hidden />
                                    Original source
                                </p>
                                <h3 id={`${headingId}-source`} className='mt-2 text-sm font-semibold text-(--color-text)'>
                                    {sourceName(evidence)}
                                </h3>
                            </div>
                            <span className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${STANCE_STYLE[evidence.stance]}`}>
                                {STANCE_LABEL[evidence.stance]}
                            </span>
                        </div>

                        <dl className='mt-5 grid grid-cols-2 gap-x-5 gap-y-4 rounded-lg border border-(--color-border) bg-(--color-bg) p-4 sm:grid-cols-3'>
                            <MetadataItem label='Author' value={evidence.author || 'Unavailable'} />
                            <MetadataItem label='Observed' value={formatDate(evidence.observedAt)} />
                            <MetadataItem label='Platform' value={evidence.platform || 'Unavailable'} />
                            <MetadataItem label='Community' value={evidence.community || 'Unavailable'} />
                            <MetadataItem
                                label='Engagement'
                                value={
                                    evidence.score == null && evidence.commentCount == null
                                        ? 'Unavailable'
                                        : `${evidence.score ?? 0} score · ${evidence.commentCount ?? 0} comments`
                                }
                            />
                            <MetadataItem label='Source link' value={evidence.sourceUrl ? 'Available' : 'Unavailable'} />
                        </dl>

                        <div className='mt-5 rounded-lg border border-(--color-border) bg-(--color-bg) p-4 sm:p-5'>
                            <div className='mb-3 flex items-center justify-between gap-3'>
                                <p className='flex items-center gap-2 text-xs font-semibold text-(--color-text)'>
                                    <Quote size={15} aria-hidden />
                                    {usingExcerptFallback ? 'Available excerpt' : 'Full available body'}
                                </p>
                                {usingExcerptFallback && (
                                    <span className='text-[10px] uppercase tracking-wider text-(--color-text-faint)'>
                                        Full body unavailable
                                    </span>
                                )}
                            </div>
                            <p className='whitespace-pre-wrap text-sm leading-7 text-(--color-text)'>{body || 'No source text is available.'}</p>
                        </div>

                        <div className='mt-4'>
                            <p className='text-[10px] font-semibold uppercase tracking-widest text-(--color-text-faint)'>
                                Source URL
                            </p>
                            {evidence.sourceUrl ? (
                            <p className='mt-1 break-all text-xs text-(--color-link) hover:text-(--color-link-hover)'>{evidence.sourceUrl}</p>
                            ) : (
                                <p className='mt-1 text-xs text-(--color-text-muted)'>No original source URL was retained.</p>
                            )}
                            <button
                                type='button'
                                onClick={() => onOpenOriginalSource?.(evidence)}
                                disabled={!evidence.sourceUrl || !onOpenOriginalSource}
                                className={`${BUTTON} mt-3`}
                            >
                                <ExternalLink size={14} aria-hidden />
                                Open original source
                            </button>
                        </div>
                    </section>

                    <section aria-labelledby={`${headingId}-interpretation`} className='px-5 py-6 sm:px-6'>
                        <p className='flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-(--color-text-faint)'>
                            <MessageSquareText size={14} aria-hidden />
                            AI interpretation
                        </p>
                        <h3 id={`${headingId}-interpretation`} className='mt-2 text-sm font-semibold text-(--color-text)'>
                            Why this evidence matters
                        </h3>
                        <div className='mt-4 rounded-lg border border-(--color-border) bg-(--color-surface) p-4'>
                            <p className='text-sm leading-6 text-(--color-text)'>
                                {evidence.relevanceReason || 'No relevance explanation was generated.'}
                            </p>
                        </div>

                        <div className='mt-6 grid gap-5 sm:grid-cols-2'>
                            <div>
                                <h4 className='flex items-center gap-2 text-xs font-semibold text-(--color-text)'>
                                    <Link2 size={14} aria-hidden />
                                    Connected claims
                                </h4>
                                <div className='mt-2 flex flex-col gap-2'>
                                    {connectedClaims.length > 0 ? connectedClaims.map(claim => (
                                        <button
                                            key={claim.id}
                                            type='button'
                                            onClick={() => navigate({ kind: 'claim', id: claim.id })}
                                            disabled={!onNavigateToOverview}
                                            className='rounded-md border border-(--color-border) bg-(--color-surface) p-3 text-left text-xs leading-5 text-(--color-text) transition-colors hover:bg-(--color-surface-tint) disabled:cursor-default'
                                        >
                                            {claim.text}
                                        </button>
                                    )) : (
                                        <p className='rounded-md border border-dashed border-(--color-border) p-3 text-xs text-(--color-text-muted)'>
                                            Not connected to a claim.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h4 className='flex items-center gap-2 text-xs font-semibold text-(--color-text)'>
                                    <Link2 size={14} aria-hidden />
                                    Problem units
                                </h4>
                                <div className='mt-2 flex flex-col gap-2'>
                                    {connectedProblemUnits.length > 0 ? connectedProblemUnits.map(unit => (
                                        <button
                                            key={unit.id}
                                            type='button'
                                            onClick={() => navigate({ kind: 'problem_unit', id: unit.id })}
                                            disabled={!onNavigateToOverview}
                                            className='rounded-md border border-(--color-border) bg-(--color-surface) p-3 text-left text-xs leading-5 text-(--color-text) transition-colors hover:bg-(--color-surface-tint) disabled:cursor-default'
                                        >
                                            {unit.title}
                                        </button>
                                    )) : (
                                        <p className='rounded-md border border-dashed border-(--color-border) p-3 text-xs text-(--color-text-muted)'>
                                            Not connected to a problem unit.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className='mt-6 rounded-lg border border-(--color-border) bg-(--color-surface) p-4'>
                            <h4 className='text-xs font-semibold text-(--color-text)'>Attach to another claim</h4>
                            <div className='mt-3 flex flex-col gap-2 sm:flex-row'>
                                <label className='sr-only' htmlFor={`${headingId}-claim`}>
                                    Claim to attach
                                </label>
                                <select
                                    id={`${headingId}-claim`}
                                    value={attachClaimId}
                                    onChange={event => setAttachClaimId(event.target.value)}
                                    disabled={!onAttachToClaim || attachableClaims.length === 0}
                                    className='min-h-9 min-w-0 flex-1 rounded-md border border-(--color-border) bg-(--color-bg) px-3 text-xs text-(--color-text) outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus)'
                                >
                                    <option value=''>
                                        {attachableClaims.length > 0 ? 'Select a claim' : 'No other claims available'}
                                    </option>
                                    {attachableClaims.map(claim => (
                                        <option key={claim.id} value={claim.id}>{claim.text}</option>
                                    ))}
                                </select>
                                <button
                                    type='button'
                                    className={BUTTON}
                                    disabled={!attachClaimId || !onAttachToClaim}
                                    onClick={() => {
                                        if (!attachClaimId) return
                                        onAttachToClaim?.(evidence, attachClaimId)
                                        setAttachClaimId('')
                                    }}
                                >
                                    <Check size={14} aria-hidden />
                                    Attach
                                </button>
                            </div>
                        </div>

                        <form
                            className='mt-6'
                            onSubmit={event => {
                                event.preventDefault()
                                onSaveUserNote?.(evidence, noteDraft.trim())
                            }}
                        >
                            <label htmlFor={`${headingId}-note`} className='text-xs font-semibold text-(--color-text)'>
                                Your note
                            </label>
                            <p className='mt-1 text-[11px] text-(--color-text-muted)'>
                                This draft stays local until you save it.
                            </p>
                            <textarea
                                id={`${headingId}-note`}
                                value={noteDraft}
                                onChange={event => setNoteDraft(event.target.value)}
                                rows={4}
                                placeholder='Add context, a caveat, or a follow-up question…'
                                className='mt-3 w-full resize-y rounded-md border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm leading-6 text-(--color-text) outline-none placeholder:text-(--color-text-faint) focus-visible:ring-2 focus-visible:ring-(--color-focus)'
                            />
                            <button
                                type='submit'
                                disabled={!onSaveUserNote || noteDraft.trim() === (evidence.userNote ?? '').trim()}
                                className={`${BUTTON} mt-2`}
                            >
                                <Bookmark size={14} aria-hidden />
                                Save note
                            </button>
                        </form>
                    </section>
                </div>

                <footer className='border-t border-(--color-border) bg-(--color-surface) px-5 py-4 sm:px-6'>
                    <div className='flex flex-wrap gap-2'>
                        <button
                            type='button'
                            onKeyDown={stopButtonKeyPropagation}
                            onClick={() => onPinChange?.(evidence, !evidence.pinned)}
                            disabled={!onPinChange}
                            className={BUTTON}
                        >
                            {evidence.pinned ? <PinOff size={14} aria-hidden /> : <Pin size={14} aria-hidden />}
                            {evidence.pinned ? 'Unpin' : 'Pin evidence'}
                        </button>
                        <button
                            type='button'
                            onClick={() => onMarkContradictory?.(evidence)}
                            disabled={!onMarkContradictory || evidence.stance === 'contradictory'}
                            className={BUTTON}
                        >
                            <BookmarkCheck size={14} aria-hidden />
                            Mark contradictory
                        </button>
                        <button
                            type='button'
                            onClick={() => onMarkIrrelevant?.(evidence)}
                            disabled={!onMarkIrrelevant || evidence.stance === 'excluded'}
                            className={BUTTON}
                        >
                            <X size={14} aria-hidden />
                            Mark irrelevant
                        </button>
                        {relatedOverviewTarget && (
                            <button
                                type='button'
                                onClick={() => navigate(relatedOverviewTarget)}
                                disabled={!onNavigateToOverview}
                                className={`${BUTTON} sm:ml-auto`}
                            >
                                <ArrowLeft size={14} aria-hidden />
                                Related overview object
                            </button>
                        )}
                    </div>
                </footer>
            </div>
        </div>
    )
}
