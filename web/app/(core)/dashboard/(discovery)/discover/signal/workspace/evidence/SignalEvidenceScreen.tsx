'use client'

import {
    AlertCircle,
    ArrowUpRight,
    Bookmark,
    CheckCircle2,
    ChevronRight,
    ExternalLink,
    FileSearch,
    Filter,
    Layers3,
    LoaderCircle,
    Menu,
    MessageSquareWarning,
    Pin,
    PinOff,
    RefreshCw,
    Sparkles,
    Users,
    Wrench,
    X,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import type {
    SignalCase,
    SignalEvidenceRecord,
    SignalEvidenceStance,
} from '../types'
import EvidenceDetailDrawer, {
    type EvidenceOverviewTarget,
} from './EvidenceDetailDrawer'

export type EvidenceNavigatorKind = EvidenceOverviewTarget['kind']
export type EvidenceNavigatorSelection = EvidenceOverviewTarget
export type EvidenceRecency = 'all' | '7d' | '30d' | '90d' | '365d'
export type EvidenceEngagement = 'all' | '10_plus' | '50_plus' | '100_plus'

export interface SignalEvidenceFilters {
    platform: string | null
    community: string | null
    problemUnitId: string | null
    audienceId: string | null
    stance: SignalEvidenceStance | 'all'
    recency: EvidenceRecency
    engagement: EvidenceEngagement
    pinnedOnly: boolean
}

export const DEFAULT_SIGNAL_EVIDENCE_FILTERS: SignalEvidenceFilters = {
    platform: null,
    community: null,
    problemUnitId: null,
    audienceId: null,
    stance: 'all',
    recency: 'all',
    engagement: 'all',
    pinnedOnly: false,
}

export interface SignalEvidenceScreenProps {
    signalCase: SignalCase | null
    /**
     * Allows already-loaded evidence to remain visible while the generated case
     * is unavailable. When omitted, signalCase.evidence is used.
     */
    evidenceRecords?: SignalEvidenceRecord[]
    loading?: boolean
    filters: SignalEvidenceFilters
    onFiltersChange: (filters: SignalEvidenceFilters) => void
    selectedObject: EvidenceNavigatorSelection | null
    onSelectedObjectChange: (selection: EvidenceNavigatorSelection | null) => void
    selectedEvidenceId: string | null
    onSelectedEvidenceIdChange: (evidenceId: string | null) => void
    onOpenOriginalSource?: (evidence: SignalEvidenceRecord) => void
    onPinChange?: (evidence: SignalEvidenceRecord, pinned: boolean) => void
    onMarkIrrelevant?: (evidence: SignalEvidenceRecord) => void
    onMarkContradictory?: (evidence: SignalEvidenceRecord) => void
    onAttachToClaim?: (evidence: SignalEvidenceRecord, claimId: string) => void
    onSaveUserNote?: (evidence: SignalEvidenceRecord, note: string) => void
    onNavigateToOverview?: (target: EvidenceOverviewTarget) => void
    className?: string
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

const SELECT =
    'min-h-9 w-full rounded-md border border-(--color-border) bg-(--color-surface) px-2.5 text-xs text-(--color-text) outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus)'

function unique(values: Array<string | null>): string[] {
    return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort((a, b) =>
        a.localeCompare(b),
    )
}

function formatDate(value: string | null): string {
    if (!value) return 'Date unavailable'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Date unavailable'
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function evidenceEngagement(evidence: SignalEvidenceRecord): number {
    return Math.max(0, evidence.score ?? 0) + Math.max(0, evidence.commentCount ?? 0)
}

function isRecent(value: string | null, recency: EvidenceRecency, now: number): boolean {
    if (recency === 'all') return true
    if (!value) return false
    const timestamp = new Date(value).getTime()
    if (Number.isNaN(timestamp)) return false
    const days = Number.parseInt(recency, 10)
    return now - timestamp <= days * 24 * 60 * 60 * 1000
}

function meetsEngagement(evidence: SignalEvidenceRecord, filter: EvidenceEngagement): boolean {
    if (filter === 'all') return true
    return evidenceEngagement(evidence) >= Number.parseInt(filter, 10)
}

function evidenceMatchesProblemUnit(
    evidence: SignalEvidenceRecord,
    problemUnitId: string,
    signalCase: SignalCase | null,
): boolean {
    const unit = signalCase?.problemUnits.find(item => item.id === problemUnitId)
    return evidence.problemUnitIds.includes(problemUnitId) || Boolean(unit?.evidenceIds.includes(evidence.id))
}

function evidenceMatchesAudience(
    evidence: SignalEvidenceRecord,
    audienceId: string,
    signalCase: SignalCase | null,
): boolean {
    const audience = signalCase?.audiences.find(item => item.id === audienceId)
    if (audience?.evidenceIds.includes(evidence.id)) return true
    return Boolean(
        signalCase?.problemUnits.some(
            unit =>
                unit.audienceIds.includes(audienceId) &&
                evidenceMatchesProblemUnit(evidence, unit.id, signalCase),
        ),
    )
}

function evidenceMatchesObject(
    evidence: SignalEvidenceRecord,
    selection: EvidenceNavigatorSelection,
    signalCase: SignalCase | null,
): boolean {
    if (!signalCase) return false
    switch (selection.kind) {
        case 'thesis': {
            const thesisClaimIds = signalCase.thesis?.claimIds ?? []
            return evidence.claimIds.some(id => thesisClaimIds.includes(id))
        }
        case 'problem_unit':
            return evidenceMatchesProblemUnit(evidence, selection.id, signalCase)
        case 'audience':
            return evidenceMatchesAudience(evidence, selection.id, signalCase)
        case 'alternative': {
            const alternative = signalCase.alternatives.find(item => item.id === selection.id)
            return Boolean(alternative?.evidenceIds.includes(evidence.id))
        }
        case 'assumption': {
            const assumption = signalCase.assumptions.find(item => item.id === selection.id)
            return Boolean(
                assumption?.evidenceIds.includes(evidence.id) ||
                (assumption?.problemUnitId &&
                    evidenceMatchesProblemUnit(evidence, assumption.problemUnitId, signalCase)),
            )
        }
        case 'claim': {
            const claim = signalCase.claims.find(item => item.id === selection.id)
            return evidence.claimIds.includes(selection.id) || Boolean(claim?.evidenceIds.includes(evidence.id))
        }
    }
}

function objectLabel(selection: EvidenceNavigatorSelection | null, signalCase: SignalCase | null): string {
    if (!selection) return 'All evidence'
    if (!signalCase) return 'Selected object'
    switch (selection.kind) {
        case 'thesis':
            return 'Signal thesis'
        case 'problem_unit':
            return signalCase.problemUnits.find(item => item.id === selection.id)?.title ?? 'Problem unit'
        case 'audience':
            return signalCase.audiences.find(item => item.id === selection.id)?.name ?? 'Audience'
        case 'alternative':
            return signalCase.alternatives.find(item => item.id === selection.id)?.name ?? 'Alternative'
        case 'assumption':
            return signalCase.assumptions.find(item => item.id === selection.id)?.question ?? 'Assumption'
        case 'claim':
            return signalCase.claims.find(item => item.id === selection.id)?.text ?? 'Generated claim'
    }
}

function hasActiveFilters(filters: SignalEvidenceFilters): boolean {
    return (
        filters.platform !== null ||
        filters.community !== null ||
        filters.problemUnitId !== null ||
        filters.audienceId !== null ||
        filters.stance !== 'all' ||
        filters.recency !== 'all' ||
        filters.engagement !== 'all' ||
        filters.pinnedOnly
    )
}

function SelectFilter({
    label,
    value,
    onChange,
    children,
}: {
    label: string
    value: string
    onChange: (value: string) => void
    children: ReactNode
}) {
    return (
        <label className='min-w-0'>
            <span className='mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-(--color-text-faint)'>
                {label}
            </span>
            <select value={value} onChange={event => onChange(event.target.value)} className={SELECT}>
                {children}
            </select>
        </label>
    )
}

function StatusNotice({
    tone,
    icon,
    title,
    detail,
}: {
    tone: 'neutral' | 'warning' | 'error'
    icon: ReactNode
    title: string
    detail: string
}) {
    const toneClass = {
        neutral: 'border-(--color-border) bg-(--color-surface)',
        warning: 'border-(--color-warning) bg-(--color-warning-soft)',
        error: 'border-(--color-error-text) bg-(--color-error-soft)',
    }[tone]
    return (
        <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-lg border p-4 ${toneClass}`}>
            <span className='mt-0.5 shrink-0 text-(--color-text-muted)'>{icon}</span>
            <div>
                <p className='text-sm font-semibold text-(--color-text)'>{title}</p>
                <p className='mt-1 text-xs leading-5 text-(--color-text-muted)'>{detail}</p>
            </div>
        </div>
    )
}

function EmptyState({
    title,
    detail,
    icon,
}: {
    title: string
    detail: string
    icon: ReactNode
}) {
    return (
        <div className='flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-(--color-border) bg-(--color-surface) px-6 py-12 text-center'>
            <span className='text-(--color-text-faint)'>{icon}</span>
            <h3 className='mt-4 text-sm font-semibold text-(--color-text)'>{title}</h3>
            <p className='mt-2 max-w-md text-xs leading-5 text-(--color-text-muted)'>{detail}</p>
        </div>
    )
}

function NavigatorItem({
    label,
    detail,
    count,
    selected,
    onClick,
}: {
    label: string
    detail?: string
    count: number
    selected: boolean
    onClick: () => void
}) {
    return (
        <button
            type='button'
            onClick={onClick}
            aria-pressed={selected}
            className={`group flex w-full items-start gap-2 rounded-md border px-3 py-2.5 text-left transition-colors ${
                selected
                    ? 'border-(--color-border-strong) bg-(--color-surface-tint)'
                    : 'border-transparent hover:border-(--color-border) hover:bg-(--color-surface)'
            }`}
        >
            <div className='min-w-0 flex-1'>
                <p className='truncate text-xs font-medium text-(--color-text)'>{label}</p>
                {detail && <p className='mt-0.5 truncate text-[10px] text-(--color-text-faint)'>{detail}</p>}
            </div>
            <span className='shrink-0 text-[10px] tabular-nums text-(--color-text-faint)'>{count}</span>
            <ChevronRight size={13} className='mt-0.5 shrink-0 text-(--color-text-faint)' aria-hidden />
        </button>
    )
}

function NavigatorSection({
    title,
    icon,
    children,
}: {
    title: string
    icon: ReactNode
    children: ReactNode
}) {
    return (
        <section>
            <h3 className='mb-1.5 flex items-center gap-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-(--color-text-faint)'>
                {icon}
                {title}
            </h3>
            <div className='flex flex-col gap-0.5'>{children}</div>
        </section>
    )
}

function EvidenceNavigator({
    signalCase,
    evidence,
    selectedObject,
    onSelectedObjectChange,
    onCloseMobile,
}: {
    signalCase: SignalCase | null
    evidence: SignalEvidenceRecord[]
    selectedObject: EvidenceNavigatorSelection | null
    onSelectedObjectChange: (selection: EvidenceNavigatorSelection | null) => void
    onCloseMobile?: () => void
}) {
    const countFor = (selection: EvidenceNavigatorSelection) =>
        evidence.filter(item => evidenceMatchesObject(item, selection, signalCase)).length
    const select = (selection: EvidenceNavigatorSelection | null) => {
        onSelectedObjectChange(selection)
        onCloseMobile?.()
    }

    return (
        <nav aria-label='Evidence objects' className='flex h-full flex-col bg-(--color-bg)'>
            <div className='flex items-center justify-between border-b border-(--color-border) px-4 py-4'>
                <div>
                    <p className='text-[10px] font-semibold uppercase tracking-[0.18em] text-(--color-text-faint)'>
                        Explore evidence
                    </p>
                    <p className='mt-1 text-xs text-(--color-text-muted)'>Choose a claim or case object</p>
                </div>
                {onCloseMobile && (
                    <button
                        type='button'
                        onClick={onCloseMobile}
                        aria-label='Close evidence navigator'
                        className='inline-flex h-8 w-8 items-center justify-center rounded-md border border-(--color-border) text-(--color-text-muted) lg:hidden'
                    >
                        <X size={15} aria-hidden />
                    </button>
                )}
            </div>
            <div className='flex-1 space-y-5 overflow-y-auto px-2 py-3'>
                <NavigatorItem
                    label='All evidence'
                    detail='No object filter'
                    count={evidence.length}
                    selected={selectedObject === null}
                    onClick={() => select(null)}
                />

                {signalCase?.thesis && (
                    <NavigatorSection title='Thesis' icon={<Sparkles size={12} aria-hidden />}>
                        <NavigatorItem
                            label={signalCase.thesis.coreProblem}
                            detail={signalCase.thesis.audience || 'Signal thesis'}
                            count={countFor({ kind: 'thesis', id: 'thesis' })}
                            selected={selectedObject?.kind === 'thesis'}
                            onClick={() => select({ kind: 'thesis', id: 'thesis' })}
                        />
                    </NavigatorSection>
                )}

                {signalCase && signalCase.problemUnits.length > 0 && (
                    <NavigatorSection title='Problem units' icon={<Layers3 size={12} aria-hidden />}>
                        {signalCase.problemUnits.map(unit => (
                            <NavigatorItem
                                key={unit.id}
                                label={unit.title}
                                detail={unit.kind.replaceAll('_', ' ')}
                                count={countFor({ kind: 'problem_unit', id: unit.id })}
                                selected={selectedObject?.kind === 'problem_unit' && selectedObject.id === unit.id}
                                onClick={() => select({ kind: 'problem_unit', id: unit.id })}
                            />
                        ))}
                    </NavigatorSection>
                )}

                {signalCase && signalCase.audiences.length > 0 && (
                    <NavigatorSection title='Audiences' icon={<Users size={12} aria-hidden />}>
                        {signalCase.audiences.map(audience => (
                            <NavigatorItem
                                key={audience.id}
                                label={audience.name}
                                detail={audience.kind.replaceAll('_', ' ')}
                                count={countFor({ kind: 'audience', id: audience.id })}
                                selected={selectedObject?.kind === 'audience' && selectedObject.id === audience.id}
                                onClick={() => select({ kind: 'audience', id: audience.id })}
                            />
                        ))}
                    </NavigatorSection>
                )}

                {signalCase && signalCase.alternatives.length > 0 && (
                    <NavigatorSection title='Alternatives' icon={<Wrench size={12} aria-hidden />}>
                        {signalCase.alternatives.map(alternative => (
                            <NavigatorItem
                                key={alternative.id}
                                label={alternative.name}
                                detail={alternative.category}
                                count={countFor({ kind: 'alternative', id: alternative.id })}
                                selected={selectedObject?.kind === 'alternative' && selectedObject.id === alternative.id}
                                onClick={() => select({ kind: 'alternative', id: alternative.id })}
                            />
                        ))}
                    </NavigatorSection>
                )}

                {signalCase && signalCase.assumptions.length > 0 && (
                    <NavigatorSection title='Assumptions' icon={<MessageSquareWarning size={12} aria-hidden />}>
                        {signalCase.assumptions.map(assumption => (
                            <NavigatorItem
                                key={assumption.id}
                                label={assumption.question}
                                detail={assumption.resolved ? 'resolved' : assumption.category.replaceAll('_', ' ')}
                                count={countFor({ kind: 'assumption', id: assumption.id })}
                                selected={selectedObject?.kind === 'assumption' && selectedObject.id === assumption.id}
                                onClick={() => select({ kind: 'assumption', id: assumption.id })}
                            />
                        ))}
                    </NavigatorSection>
                )}

                {signalCase && signalCase.claims.length > 0 && (
                    <NavigatorSection title='Generated claims' icon={<Bookmark size={12} aria-hidden />}>
                        {signalCase.claims.map(claim => (
                            <NavigatorItem
                                key={claim.id}
                                label={claim.text}
                                detail={`${claim.kind.replaceAll('_', ' ')} · ${claim.confidence}`}
                                count={countFor({ kind: 'claim', id: claim.id })}
                                selected={selectedObject?.kind === 'claim' && selectedObject.id === claim.id}
                                onClick={() => select({ kind: 'claim', id: claim.id })}
                            />
                        ))}
                    </NavigatorSection>
                )}

                {!signalCase && (
                    <p className='mx-2 rounded-md border border-dashed border-(--color-border) p-3 text-xs leading-5 text-(--color-text-muted)'>
                        Case objects are unavailable. Existing evidence remains accessible.
                    </p>
                )}
            </div>
        </nav>
    )
}

function EvidenceRow({
    evidence,
    onSelect,
    onOpenOriginalSource,
    onPinChange,
}: {
    evidence: SignalEvidenceRecord
    onSelect: () => void
    onOpenOriginalSource?: (evidence: SignalEvidenceRecord) => void
    onPinChange?: (evidence: SignalEvidenceRecord, pinned: boolean) => void
}) {
    return (
        <article className='rounded-lg border border-(--color-border) bg-(--color-surface) transition-colors hover:border-(--color-border-strong)'>
            <div className='flex items-start gap-3 p-4 sm:p-5'>
                <button
                    type='button'
                    onClick={onSelect}
                    aria-label={`View details for ${evidence.title}`}
                    className='min-w-0 flex-1 text-left'
                >
                    <div className='flex flex-wrap items-center gap-2'>
                        <span className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${STANCE_STYLE[evidence.stance]}`}>
                            {STANCE_LABEL[evidence.stance]}
                        </span>
                        {evidence.pinned && (
                            <span className='inline-flex items-center gap-1 text-[10px] font-semibold text-(--color-text-muted)'>
                                <Pin size={11} aria-hidden />
                                Pinned
                            </span>
                        )}
                    </div>
                    <h3 className='mt-3 text-sm font-semibold leading-5 text-(--color-text)'>{evidence.title}</h3>
                    <p className='mt-2 line-clamp-3 text-sm leading-6 text-(--color-text-muted)'>{evidence.excerpt}</p>
                </button>
                <button
                    type='button'
                    onClick={() => onPinChange?.(evidence, !evidence.pinned)}
                    disabled={!onPinChange}
                    className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-(--color-border) text-(--color-text-muted) transition-colors hover:bg-(--color-surface-tint) hover:text-(--color-text) disabled:cursor-not-allowed disabled:opacity-40'
                    aria-label={evidence.pinned ? `Unpin ${evidence.title}` : `Pin ${evidence.title}`}
                >
                    {evidence.pinned ? <PinOff size={15} aria-hidden /> : <Pin size={15} aria-hidden />}
                </button>
            </div>

            <div className='grid gap-3 border-t border-(--color-border) px-4 py-3 text-[11px] text-(--color-text-muted) sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto] sm:px-5'>
                <div className='min-w-0'>
                    <p className='truncate font-medium text-(--color-text)'>
                        {[evidence.platform, evidence.community].filter(Boolean).join(' · ') || 'Source unavailable'}
                    </p>
                    <p className='mt-0.5 truncate'>
                        {evidence.author || 'Unknown author'} · {formatDate(evidence.observedAt)}
                    </p>
                </div>
                <div>
                    <p className='font-medium text-(--color-text)'>
                        {evidence.score == null ? '—' : evidence.score} score · {evidence.commentCount == null ? '—' : evidence.commentCount} comments
                    </p>
                    <p className='mt-0.5'>
                        {evidence.claimIds.length} connected {evidence.claimIds.length === 1 ? 'claim' : 'claims'}
                    </p>
                </div>
                <div className='flex items-center gap-2 sm:justify-end'>
                    <span className={evidence.sourceUrl ? 'text-(--color-success-text)' : 'text-(--color-text-faint)'}>
                        {evidence.sourceUrl ? 'Source available' : 'Source unavailable'}
                    </span>
                    <button
                        type='button'
                        onClick={() => onOpenOriginalSource?.(evidence)}
                        disabled={!evidence.sourceUrl || !onOpenOriginalSource}
                        className='inline-flex h-8 w-8 items-center justify-center rounded-md border border-(--color-border) text-(--color-text-muted) transition-colors hover:bg-(--color-surface-tint) hover:text-(--color-text) disabled:cursor-not-allowed disabled:opacity-40'
                        aria-label={`Open original source for ${evidence.title}`}
                    >
                        <ExternalLink size={13} aria-hidden />
                    </button>
                </div>
            </div>

            <button
                type='button'
                onClick={onSelect}
                aria-label={`View relevance details for ${evidence.title}`}
                className='flex w-full items-start gap-2 border-t border-(--color-border) px-4 py-3 text-left sm:px-5'
            >
                <CheckCircle2 size={13} className='mt-0.5 shrink-0 text-(--color-text-faint)' aria-hidden />
                <span className='min-w-0 flex-1 text-[11px] leading-5 text-(--color-text-muted)'>
                    <span className='font-semibold text-(--color-text)'>Relevance: </span>
                    {evidence.relevanceReason || 'No relevance reason available.'}
                </span>
                <ArrowUpRight size={13} className='mt-0.5 shrink-0 text-(--color-text-faint)' aria-hidden />
            </button>
        </article>
    )
}

function LoadingRows() {
    return (
        <div aria-busy='true' aria-label='Loading evidence' className='space-y-3'>
            {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className='animate-pulse rounded-lg border border-(--color-border) bg-(--color-surface) p-5'>
                    <div className='h-3 w-20 rounded bg-(--color-border)' />
                    <div className='mt-4 h-4 w-2/3 rounded bg-(--color-border)' />
                    <div className='mt-3 h-3 w-full rounded bg-(--color-border)' />
                    <div className='mt-2 h-3 w-5/6 rounded bg-(--color-border)' />
                    <div className='mt-5 h-10 border-t border-(--color-border)' />
                </div>
            ))}
        </div>
    )
}

export default function SignalEvidenceScreen({
    signalCase,
    evidenceRecords,
    loading = false,
    filters,
    onFiltersChange,
    selectedObject,
    onSelectedObjectChange,
    selectedEvidenceId,
    onSelectedEvidenceIdChange,
    onOpenOriginalSource,
    onPinChange,
    onMarkIrrelevant,
    onMarkContradictory,
    onAttachToClaim,
    onSaveUserNote,
    onNavigateToOverview,
    className = '',
}: SignalEvidenceScreenProps) {
    const [mobileNavigatorOpen, setMobileNavigatorOpen] = useState(false)
    const allEvidence = useMemo(
        () => evidenceRecords ?? signalCase?.evidence ?? [],
        [evidenceRecords, signalCase?.evidence],
    )
    const platforms = useMemo(() => unique(allEvidence.map(item => item.platform)), [allEvidence])
    const communities = useMemo(() => unique(allEvidence.map(item => item.community)), [allEvidence])
    const [filterReferenceTime] = useState(() => Date.now())

    const filteredEvidence = useMemo(
        () =>
            allEvidence.filter(evidence => {
                if (
                    selectedObject &&
                    signalCase &&
                    !evidenceMatchesObject(evidence, selectedObject, signalCase)
                ) return false
                if (filters.platform && evidence.platform !== filters.platform) return false
                if (filters.community && evidence.community !== filters.community) return false
                if (
                    filters.problemUnitId &&
                    !evidenceMatchesProblemUnit(evidence, filters.problemUnitId, signalCase)
                ) return false
                if (
                    filters.audienceId &&
                    signalCase &&
                    !evidenceMatchesAudience(evidence, filters.audienceId, signalCase)
                ) return false
                if (filters.stance !== 'all' && evidence.stance !== filters.stance) return false
                if (!isRecent(evidence.observedAt, filters.recency, filterReferenceTime)) return false
                if (!meetsEngagement(evidence, filters.engagement)) return false
                if (filters.pinnedOnly && !evidence.pinned) return false
                return true
            }),
        [allEvidence, filterReferenceTime, filters, selectedObject, signalCase],
    )

    const selectedEvidence =
        allEvidence.find(evidence => evidence.id === selectedEvidenceId) ?? null
    const filterCount = [
        filters.platform,
        filters.community,
        filters.problemUnitId,
        filters.audienceId,
        filters.stance !== 'all' ? filters.stance : null,
        filters.recency !== 'all' ? filters.recency : null,
        filters.engagement !== 'all' ? filters.engagement : null,
        filters.pinnedOnly ? 'pinned' : null,
    ].filter(Boolean).length

    const setFilter = <K extends keyof SignalEvidenceFilters>(
        key: K,
        value: SignalEvidenceFilters[K],
    ) => onFiltersChange({ ...filters, [key]: value })

    const isGenerating =
        loading || signalCase?.status === 'queued' || signalCase?.status === 'generating'

    return (
        <div className={`min-w-0 overflow-hidden rounded-lg border border-(--color-border) bg-(--color-bg) ${className}`}>
            <div className='grid min-h-[680px] min-w-0 lg:grid-cols-[260px_minmax(0,1fr)]'>
                <aside className='hidden min-h-0 border-r border-(--color-border) lg:block'>
                    <EvidenceNavigator
                        signalCase={signalCase}
                        evidence={allEvidence}
                        selectedObject={selectedObject}
                        onSelectedObjectChange={onSelectedObjectChange}
                    />
                </aside>

                <main className='min-w-0'>
                    <header className='border-b border-(--color-border) bg-(--color-surface) px-4 py-4 sm:px-5'>
                        <div className='flex flex-wrap items-center justify-between gap-3'>
                            <div className='flex min-w-0 items-center gap-3'>
                                <button
                                    type='button'
                                    onClick={() => setMobileNavigatorOpen(true)}
                                    className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-(--color-border) text-(--color-text-muted) lg:hidden'
                                    aria-label='Open evidence navigator'
                                >
                                    <Menu size={16} aria-hidden />
                                </button>
                                <div className='min-w-0'>
                                    <p className='truncate text-sm font-semibold text-(--color-text)'>
                                        {objectLabel(selectedObject, signalCase)}
                                    </p>
                                    <p className='mt-0.5 text-xs text-(--color-text-muted)'>
                                        {filteredEvidence.length} of {allEvidence.length} evidence records
                                    </p>
                                </div>
                            </div>
                            {(hasActiveFilters(filters) || selectedObject) && (
                                <button
                                    type='button'
                                    onClick={() => {
                                        onFiltersChange(DEFAULT_SIGNAL_EVIDENCE_FILTERS)
                                        onSelectedObjectChange(null)
                                    }}
                                    className='inline-flex min-h-9 items-center gap-2 rounded-md border border-(--color-border) px-3 py-2 text-xs font-semibold text-(--color-text-muted) transition-colors hover:bg-(--color-surface-tint) hover:text-(--color-text)'
                                >
                                    <X size={13} aria-hidden />
                                    Clear {filterCount + (selectedObject ? 1 : 0)} filters
                                </button>
                            )}
                        </div>

                        <div className='mt-4 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8'>
                            <SelectFilter
                                label='Source'
                                value={filters.platform ?? ''}
                                onChange={value => setFilter('platform', value || null)}
                            >
                                <option value=''>All platforms</option>
                                {platforms.map(platform => <option key={platform} value={platform}>{platform}</option>)}
                            </SelectFilter>
                            <SelectFilter
                                label='Community'
                                value={filters.community ?? ''}
                                onChange={value => setFilter('community', value || null)}
                            >
                                <option value=''>All communities</option>
                                {communities.map(community => <option key={community} value={community}>{community}</option>)}
                            </SelectFilter>
                            <SelectFilter
                                label='Problem unit'
                                value={filters.problemUnitId ?? ''}
                                onChange={value => setFilter('problemUnitId', value || null)}
                            >
                                <option value=''>All problem units</option>
                                {signalCase?.problemUnits.map(unit => (
                                    <option key={unit.id} value={unit.id}>{unit.title}</option>
                                ))}
                            </SelectFilter>
                            <SelectFilter
                                label='Audience'
                                value={filters.audienceId ?? ''}
                                onChange={value => setFilter('audienceId', value || null)}
                            >
                                <option value=''>All audiences</option>
                                {signalCase?.audiences.map(audience => (
                                    <option key={audience.id} value={audience.id}>{audience.name}</option>
                                ))}
                            </SelectFilter>
                            <SelectFilter
                                label='Stance'
                                value={filters.stance}
                                onChange={value => setFilter('stance', value as SignalEvidenceFilters['stance'])}
                            >
                                <option value='all'>All stances</option>
                                <option value='supporting'>Supporting</option>
                                <option value='contradictory'>Contradictory</option>
                                <option value='ambiguous'>Ambiguous</option>
                                <option value='excluded'>Excluded</option>
                            </SelectFilter>
                            <SelectFilter
                                label='Recency'
                                value={filters.recency}
                                onChange={value => setFilter('recency', value as EvidenceRecency)}
                            >
                                <option value='all'>Any time</option>
                                <option value='7d'>Past 7 days</option>
                                <option value='30d'>Past 30 days</option>
                                <option value='90d'>Past 90 days</option>
                                <option value='365d'>Past year</option>
                            </SelectFilter>
                            <SelectFilter
                                label='Engagement'
                                value={filters.engagement}
                                onChange={value => setFilter('engagement', value as EvidenceEngagement)}
                            >
                                <option value='all'>Any engagement</option>
                                <option value='10_plus'>10+ combined</option>
                                <option value='50_plus'>50+ combined</option>
                                <option value='100_plus'>100+ combined</option>
                            </SelectFilter>
                            <label className='min-w-0'>
                                <span className='mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-(--color-text-faint)'>
                                    Pinned
                                </span>
                                <span className='flex min-h-9 items-center rounded-md border border-(--color-border) bg-(--color-surface) px-2.5'>
                                    <input
                                        type='checkbox'
                                        checked={filters.pinnedOnly}
                                        onChange={event => setFilter('pinnedOnly', event.target.checked)}
                                        className='h-3.5 w-3.5'
                                    />
                                    <span className='ml-2 text-xs text-(--color-text)'>Pinned only</span>
                                </span>
                            </label>
                        </div>
                    </header>

                    <div className='space-y-3 p-4 sm:p-5'>
                        {isGenerating && (
                            <StatusNotice
                                tone='neutral'
                                icon={<LoaderCircle size={17} className='animate-spin' aria-hidden />}
                                title={signalCase?.progress?.label || 'Generating evidence analysis'}
                                detail={
                                    allEvidence.length > 0
                                        ? 'Available evidence stays visible while the case refreshes.'
                                        : 'Evidence will appear here as it becomes available.'
                                }
                            />
                        )}
                        {!signalCase && allEvidence.length > 0 && (
                            <StatusNotice
                                tone='warning'
                                icon={<AlertCircle size={17} aria-hidden />}
                                title='Generated case unavailable'
                                detail='You can still inspect the evidence already loaded. Case-object navigation and relationship filters may be limited.'
                            />
                        )}
                        {signalCase?.status === 'stale' && (
                            <StatusNotice
                                tone='warning'
                                icon={<RefreshCw size={17} aria-hidden />}
                                title='Evidence analysis may be stale'
                                detail='The source data changed after this case was generated. Review the evidence, but refresh the case before relying on its interpretation.'
                            />
                        )}
                        {signalCase?.status === 'insufficient_evidence' && (
                            <StatusNotice
                                tone='warning'
                                icon={<FileSearch size={17} aria-hidden />}
                                title='Insufficient evidence'
                                detail='The available records were not strong or diverse enough for a complete case. Existing source material remains available below.'
                            />
                        )}
                        {signalCase?.status === 'failed' && (
                            <StatusNotice
                                tone='error'
                                icon={<AlertCircle size={17} aria-hidden />}
                                title='Evidence analysis failed'
                                detail={signalCase.safeError || 'The generated case could not be completed. Existing evidence remains available.'}
                            />
                        )}

                        {isGenerating && allEvidence.length === 0 ? (
                            <LoadingRows />
                        ) : allEvidence.length === 0 && signalCase?.status === 'failed' ? (
                            <EmptyState
                                icon={<AlertCircle size={24} aria-hidden />}
                                title='No evidence is available'
                                detail='The analysis failed before any source records were retained.'
                            />
                        ) : allEvidence.length === 0 && signalCase?.status === 'insufficient_evidence' ? (
                            <EmptyState
                                icon={<FileSearch size={24} aria-hidden />}
                                title='Not enough evidence yet'
                                detail='Broaden the source set or collect more recent discussions, then generate the case again.'
                            />
                        ) : allEvidence.length === 0 && !signalCase ? (
                            <EmptyState
                                icon={<AlertCircle size={24} aria-hidden />}
                                title='Evidence unavailable'
                                detail='No generated case or retained evidence was provided to this workspace.'
                            />
                        ) : allEvidence.length === 0 ? (
                            <EmptyState
                                icon={<FileSearch size={24} aria-hidden />}
                                title='No evidence collected'
                                detail='Source records will appear here after evidence has been collected for this signal.'
                            />
                        ) : filteredEvidence.length === 0 ? (
                            <EmptyState
                                icon={<Filter size={24} aria-hidden />}
                                title='No evidence matches these filters'
                                detail='Clear one or more filters or choose a different case object to see the retained evidence.'
                            />
                        ) : (
                            <div className='space-y-3' aria-label='Evidence results'>
                                {filteredEvidence.map(evidence => (
                                    <EvidenceRow
                                        key={evidence.id}
                                        evidence={evidence}
                                        onSelect={() => onSelectedEvidenceIdChange(evidence.id)}
                                        onOpenOriginalSource={onOpenOriginalSource}
                                        onPinChange={onPinChange}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {mobileNavigatorOpen && (
                <div className='fixed inset-0 z-40 lg:hidden'>
                    <button
                        type='button'
                        className='absolute inset-0 bg-black/35'
                        aria-label='Close evidence navigator'
                        onClick={() => setMobileNavigatorOpen(false)}
                    />
                    <aside className='absolute inset-y-0 left-0 w-[min(88vw,320px)] border-r border-(--color-border) bg-(--color-bg) shadow-2xl'>
                        <EvidenceNavigator
                            signalCase={signalCase}
                            evidence={allEvidence}
                            selectedObject={selectedObject}
                            onSelectedObjectChange={onSelectedObjectChange}
                            onCloseMobile={() => setMobileNavigatorOpen(false)}
                        />
                    </aside>
                </div>
            )}

            <EvidenceDetailDrawer
                open={selectedEvidence !== null}
                evidence={selectedEvidence}
                signalCase={signalCase}
                onClose={() => onSelectedEvidenceIdChange(null)}
                onOpenOriginalSource={onOpenOriginalSource}
                onPinChange={onPinChange}
                onMarkIrrelevant={onMarkIrrelevant}
                onMarkContradictory={onMarkContradictory}
                onAttachToClaim={onAttachToClaim}
                onSaveUserNote={onSaveUserNote}
                onNavigateToOverview={onNavigateToOverview}
            />
        </div>
    )
}
