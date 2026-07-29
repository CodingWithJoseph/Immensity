'use client'

import { useEffect, useId, useState } from 'react'
import {
    Activity,
    Ban,
    Check,
    Combine,
    ExternalLink,
    Link2,
    Pencil,
    Pin,
    PinOff,
    Quote,
    Save,
    ShieldCheck,
    Split,
    Users,
    X,
} from 'lucide-react'
import { useDialogFocus } from '@/app/(core)/dashboard/hooks/useDialogFocus'
import type {
    SignalAudience,
    SignalClaim,
    SignalEvidenceRecord,
    SignalProblemUnit,
    SignalProblemUnitKind,
} from '../types'

export interface SignalProblemUnitTextUpdate {
    title: string
    description: string | null
}

export interface ProblemUnitDrawerProps {
    unit: SignalProblemUnit
    problemUnits: SignalProblemUnit[]
    claims: SignalClaim[]
    evidence: SignalEvidenceRecord[]
    audiences: SignalAudience[]
    onClose: () => void
    onSelectProblemUnit?: (problemUnitId: string) => void
    onEditProblemUnit?: (problemUnitId: string, update: SignalProblemUnitTextUpdate) => void
    onReclassifyProblemUnit?: (problemUnitId: string, kind: SignalProblemUnitKind) => void
    onPinProblemUnit?: (problemUnitId: string, pinned: boolean) => void
    onRejectProblemUnit?: (problemUnitId: string, rejected: boolean) => void
    onRequestProblemUnitSplit?: (problemUnitId: string) => void
    onRequestProblemUnitMerge?: (problemUnitId: string) => void
    onOpenEvidence?: (evidenceId: string) => void
    onValidateProblemUnit?: (problemUnitId: string) => void
}

const KIND_LABEL: Record<SignalProblemUnitKind, string> = {
    cause: 'Cause',
    core_problem: 'Core problem',
    symptom: 'Symptom',
    consequence: 'Consequence',
    workaround: 'Workaround',
}

const CLAIM_KIND_LABEL: Record<SignalClaim['kind'], string> = {
    observed: 'Observed',
    inferred: 'Inferred',
    user_confirmed: 'User confirmed',
}

const CLAIM_KIND_STYLE: Record<SignalClaim['kind'], string> = {
    observed: 'bg-(--color-blue-soft) text-(--color-info-text)',
    inferred: 'bg-(--color-warning-soft) text-(--color-warning-text)',
    user_confirmed: 'bg-(--color-success-soft) text-(--color-success-text)',
}

const SECONDARY_BUTTON =
    'inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-(--color-border) px-3 py-2 text-xs font-semibold text-(--color-text) transition-colors hover:bg-(--color-surface-tint) disabled:cursor-not-allowed disabled:opacity-40'

function sentenceCase(value: string): string {
    return value.replaceAll('_', ' ').replace(/^\w/, character => character.toUpperCase())
}

function formatMomentum(value: number | null): string {
    if (value == null || Number.isNaN(value)) return 'Unavailable'
    const percentage = Math.abs(value) <= 1 ? value * 100 : value
    return `${percentage > 0 ? '+' : ''}${Math.round(percentage)}%`
}

function DrawerSection({
    icon,
    title,
    children,
}: {
    icon: React.ReactNode
    title: string
    children: React.ReactNode
}) {
    return (
        <section aria-labelledby={`unit-drawer-${title.toLowerCase().replaceAll(' ', '-')}`}>
            <div className='mb-3 flex items-center gap-2 text-(--color-text-muted)'>
                {icon}
                <h3
                    id={`unit-drawer-${title.toLowerCase().replaceAll(' ', '-')}`}
                    className='text-[11px] font-semibold uppercase tracking-widest'
                >
                    {title}
                </h3>
            </div>
            {children}
        </section>
    )
}

function RelatedUnitButton({
    label,
    unit,
    onSelect,
}: {
    label: string
    unit: SignalProblemUnit
    onSelect?: (problemUnitId: string) => void
}) {
    return (
        <button
            type='button'
            onClick={() => onSelect?.(unit.id)}
            disabled={!onSelect}
            className='group flex w-full items-start gap-3 rounded-md border border-(--color-border) p-3 text-left transition-colors hover:bg-(--color-surface-tint) disabled:cursor-default disabled:opacity-80'
        >
            <span className='mt-0.5 min-w-16 text-[10px] font-semibold uppercase tracking-wider text-(--color-text-muted)'>
                {label}
            </span>
            <span className='min-w-0'>
                <span className='block text-xs font-medium text-(--color-text)'>{unit.title}</span>
                <span className='mt-1 block text-[11px] text-(--color-text-muted)'>{KIND_LABEL[unit.kind]}</span>
            </span>
        </button>
    )
}

export default function ProblemUnitDrawer({
    unit,
    problemUnits,
    claims,
    evidence,
    audiences,
    onClose,
    onSelectProblemUnit,
    onEditProblemUnit,
    onReclassifyProblemUnit,
    onPinProblemUnit,
    onRejectProblemUnit,
    onRequestProblemUnitSplit,
    onRequestProblemUnitMerge,
    onOpenEvidence,
    onValidateProblemUnit,
}: ProblemUnitDrawerProps) {
    const dialogRef = useDialogFocus<HTMLElement>()
    const titleId = useId()
    const descriptionId = useId()
    const [editing, setEditing] = useState(false)
    const [draftTitle, setDraftTitle] = useState(unit.title)
    const [draftDescription, setDraftDescription] = useState(unit.description ?? '')

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    const parent = unit.parentId
        ? problemUnits.find(candidate => candidate.id === unit.parentId) ?? null
        : null
    const children = problemUnits.filter(candidate => candidate.parentId === unit.id)
    const linkedClaims = unit.claimIds
        .map(id => claims.find(claim => claim.id === id))
        .filter((claim): claim is SignalClaim => Boolean(claim))
    const linkedEvidence = unit.evidenceIds
        .map(id => evidence.find(record => record.id === id))
        .filter((record): record is SignalEvidenceRecord => Boolean(record))
    const missingEvidenceIds = unit.evidenceIds.filter(id => !evidence.some(record => record.id === id))
    const linkedAudiences = unit.audienceIds
        .map(id => audiences.find(audience => audience.id === id))
        .filter((audience): audience is SignalAudience => Boolean(audience))
    const canSave = draftTitle.trim().length > 0 && (
        draftTitle.trim() !== unit.title ||
        (draftDescription.trim() || null) !== unit.description
    )

    const saveEdit = () => {
        if (!canSave || !onEditProblemUnit) return
        onEditProblemUnit(unit.id, {
            title: draftTitle.trim(),
            description: draftDescription.trim() || null,
        })
        setEditing(false)
    }

    return (
        <div
            className='fixed inset-0 z-50 flex justify-end bg-black/40'
            onMouseDown={event => {
                if (event.target === event.currentTarget) onClose()
            }}
        >
            <aside
                ref={dialogRef}
                role='dialog'
                aria-modal='true'
                aria-labelledby={titleId}
                aria-describedby={unit.description ? descriptionId : undefined}
                tabIndex={-1}
                className='flex h-full w-full max-w-2xl flex-col border-l border-(--color-border) bg-(--color-surface) shadow-2xl outline-none'
            >
                <header className='shrink-0 border-b border-(--color-border) px-5 py-4 sm:px-6'>
                    <div className='flex items-start justify-between gap-4'>
                        <div className='min-w-0 flex-1'>
                            <div className='mb-2 flex flex-wrap items-center gap-2'>
                                <span className='text-[10px] font-semibold uppercase tracking-widest text-(--color-text-muted)'>
                                    Problem unit
                                </span>
                                {unit.pinned && (
                                    <span className='inline-flex items-center gap-1 rounded-md bg-(--color-blue-soft) px-2 py-1 text-[10px] font-semibold text-(--color-info-text)'>
                                        <Pin className='h-3 w-3' aria-hidden />
                                        Pinned
                                    </span>
                                )}
                                {unit.rejected && (
                                    <span className='inline-flex items-center gap-1 rounded-md bg-(--color-error-soft) px-2 py-1 text-[10px] font-semibold text-(--color-error-text)'>
                                        <Ban className='h-3 w-3' aria-hidden />
                                        Rejected
                                    </span>
                                )}
                            </div>
                            <h2 id={titleId} className='text-lg font-semibold leading-snug text-(--color-text)'>
                                {unit.title}
                            </h2>
                            {unit.description && (
                                <p id={descriptionId} className='mt-2 text-sm leading-6 text-(--color-text-muted)'>
                                    {unit.description}
                                </p>
                            )}
                        </div>
                        <button
                            type='button'
                            onClick={onClose}
                            aria-label='Close problem unit details'
                            title='Close'
                            className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-(--color-border) text-(--color-text-muted) transition-colors hover:bg-(--color-surface-tint) hover:text-(--color-text)'
                        >
                            <X className='h-4 w-4' aria-hidden />
                        </button>
                    </div>
                </header>

                <div className='flex-1 overflow-y-auto'>
                    <div className='flex flex-col gap-7 px-5 py-6 sm:px-6'>
                        <section aria-label='Problem unit controls' className='rounded-lg border border-(--color-border) bg-(--color-bg) p-4'>
                            <div className='grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]'>
                                <div>
                                    <label htmlFor='problem-unit-classification' className='text-[11px] font-semibold uppercase tracking-wider text-(--color-text-muted)'>
                                        Classification
                                    </label>
                                    <select
                                        id='problem-unit-classification'
                                        value={unit.kind}
                                        onChange={event => onReclassifyProblemUnit?.(
                                            unit.id,
                                            event.target.value as SignalProblemUnitKind,
                                        )}
                                        disabled={!onReclassifyProblemUnit}
                                        className='mt-2 w-full rounded-md border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-text) outline-none focus:border-(--color-focus) disabled:cursor-not-allowed disabled:opacity-60'
                                    >
                                        {Object.entries(KIND_LABEL).map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className='grid grid-cols-2 gap-3 text-sm'>
                                    <div>
                                        <p className='text-[10px] uppercase tracking-wider text-(--color-text-muted)'>Confidence</p>
                                        <p className='mt-2 font-semibold text-(--color-text)'>{sentenceCase(unit.confidence)}</p>
                                    </div>
                                    <div>
                                        <p className='text-[10px] uppercase tracking-wider text-(--color-text-muted)'>Evidence</p>
                                        <p className='mt-2 font-semibold tabular-nums text-(--color-text)'>{unit.evidenceCount}</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <DrawerSection icon={<Pencil className='h-4 w-4' aria-hidden />} title='Statement'>
                            {editing ? (
                                <div className='rounded-lg border border-(--color-border) bg-(--color-bg) p-4'>
                                    <label htmlFor='problem-unit-title' className='text-xs font-semibold text-(--color-text)'>Statement</label>
                                    <input
                                        id='problem-unit-title'
                                        value={draftTitle}
                                        onChange={event => setDraftTitle(event.target.value)}
                                        className='mt-2 w-full rounded-md border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-text) outline-none focus:border-(--color-focus)'
                                    />
                                    <label htmlFor='problem-unit-description' className='mt-4 block text-xs font-semibold text-(--color-text)'>Detail</label>
                                    <textarea
                                        id='problem-unit-description'
                                        rows={4}
                                        value={draftDescription}
                                        onChange={event => setDraftDescription(event.target.value)}
                                        className='mt-2 w-full resize-y rounded-md border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm leading-6 text-(--color-text) outline-none focus:border-(--color-focus)'
                                    />
                                    <div className='mt-3 flex flex-wrap justify-end gap-2'>
                                        <button
                                            type='button'
                                            onClick={() => {
                                                setDraftTitle(unit.title)
                                                setDraftDescription(unit.description ?? '')
                                                setEditing(false)
                                            }}
                                            className={SECONDARY_BUTTON}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type='button'
                                            onClick={saveEdit}
                                            disabled={!canSave || !onEditProblemUnit}
                                            className='inline-flex min-h-9 items-center gap-2 rounded-md bg-(--color-button) px-3 py-2 text-xs font-semibold text-(--color-on-button) transition-colors hover:bg-(--color-button-hover) disabled:cursor-not-allowed disabled:opacity-40'
                                        >
                                            <Save className='h-3.5 w-3.5' aria-hidden />
                                            Save statement
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type='button'
                                    aria-label='Edit problem unit statement'
                                    onClick={() => {
                                        setDraftTitle(unit.title)
                                        setDraftDescription(unit.description ?? '')
                                        setEditing(true)
                                    }}
                                    disabled={!onEditProblemUnit}
                                    className='w-full rounded-lg border border-(--color-border) p-4 text-left transition-colors hover:bg-(--color-surface-tint) disabled:cursor-default disabled:opacity-80'
                                >
                                    <span className='block text-sm font-medium leading-6 text-(--color-text)'>{unit.title}</span>
                                    <span className='mt-2 block text-xs leading-5 text-(--color-text-muted)'>
                                        {unit.description ?? 'No additional detail recorded.'}
                                    </span>
                                    {onEditProblemUnit && (
                                        <span className='mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-(--color-info-text)'>
                                            <Pencil className='h-3.5 w-3.5' aria-hidden />
                                            Edit statement
                                        </span>
                                    )}
                                </button>
                            )}
                        </DrawerSection>

                        <DrawerSection icon={<Link2 className='h-4 w-4' aria-hidden />} title='Relationships'>
                            {parent || children.length > 0 ? (
                                <div className='flex flex-col gap-2'>
                                    {parent && <RelatedUnitButton label='Parent' unit={parent} onSelect={onSelectProblemUnit} />}
                                    {children.map(child => (
                                        <RelatedUnitButton key={child.id} label='Child' unit={child} onSelect={onSelectProblemUnit} />
                                    ))}
                                </div>
                            ) : (
                                <p className='rounded-md border border-dashed border-(--color-border) p-4 text-sm text-(--color-text-muted)'>
                                    No parent or child relationship is recorded.
                                </p>
                            )}
                        </DrawerSection>

                        <DrawerSection icon={<Quote className='h-4 w-4' aria-hidden />} title='Claims and evidence'>
                            <div className='flex flex-col gap-4'>
                                {linkedClaims.length > 0 ? (
                                    <ul className='flex flex-col gap-2' aria-label='Linked claims'>
                                        {linkedClaims.map(claim => (
                                            <li key={claim.id} className='rounded-md border border-(--color-border) p-3'>
                                                <div className='flex flex-wrap items-center gap-2'>
                                                    <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${CLAIM_KIND_STYLE[claim.kind]}`}>
                                                        {CLAIM_KIND_LABEL[claim.kind]}
                                                    </span>
                                                    <span className='text-[10px] font-medium uppercase tracking-wider text-(--color-text-muted)'>
                                                        {sentenceCase(claim.confidence)} confidence
                                                    </span>
                                                    {claim.rejected && (
                                                        <span className='text-[10px] font-semibold text-(--color-error-text)'>Rejected</span>
                                                    )}
                                                </div>
                                                <p className='mt-2 text-sm leading-6 text-(--color-text)'>{claim.text}</p>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className='text-sm text-(--color-text-muted)'>No claims are linked to this unit.</p>
                                )}

                                {linkedEvidence.length > 0 || missingEvidenceIds.length > 0 ? (
                                    <ul className='flex flex-col gap-2' aria-label='Evidence references'>
                                        {linkedEvidence.map(record => (
                                            <li key={record.id}>
                                                <button
                                                    type='button'
                                                    onClick={() => onOpenEvidence?.(record.id)}
                                                    disabled={!onOpenEvidence}
                                                    className='flex w-full items-start justify-between gap-3 rounded-md bg-(--color-bg) p-3 text-left transition-colors hover:bg-(--color-surface-tint) disabled:cursor-default'
                                                >
                                                    <span className='min-w-0'>
                                                        <span className='block text-xs font-semibold text-(--color-text)'>{record.title}</span>
                                                        <span className='mt-1 line-clamp-2 block text-xs leading-5 text-(--color-text-muted)'>
                                                            {record.excerpt}
                                                        </span>
                                                    </span>
                                                    <ExternalLink className='mt-0.5 h-3.5 w-3.5 shrink-0 text-(--color-text-muted)' aria-hidden />
                                                </button>
                                            </li>
                                        ))}
                                        {missingEvidenceIds.map(evidenceId => (
                                            <li key={evidenceId}>
                                                <button
                                                    type='button'
                                                    onClick={() => onOpenEvidence?.(evidenceId)}
                                                    disabled={!onOpenEvidence}
                                                    className='flex w-full items-center justify-between gap-3 rounded-md bg-(--color-bg) p-3 text-left text-xs text-(--color-text-muted) transition-colors hover:bg-(--color-surface-tint) disabled:cursor-default'
                                                >
                                                    Evidence reference {evidenceId}
                                                    <ExternalLink className='h-3.5 w-3.5 shrink-0' aria-hidden />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className='text-sm text-(--color-text-muted)'>No evidence references are linked.</p>
                                )}
                            </div>
                        </DrawerSection>

                        <DrawerSection icon={<Users className='h-4 w-4' aria-hidden />} title='Audience context'>
                            {linkedAudiences.length > 0 ? (
                                <ul className='flex flex-col gap-3'>
                                    {linkedAudiences.map(audience => (
                                        <li key={audience.id} className='rounded-md border border-(--color-border) p-4'>
                                            <div className='flex flex-wrap items-center gap-2'>
                                                <p className='text-sm font-semibold text-(--color-text)'>{audience.name}</p>
                                                <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${CLAIM_KIND_STYLE[audience.kind]}`}>
                                                    {CLAIM_KIND_LABEL[audience.kind]}
                                                </span>
                                            </div>
                                            <p className='mt-2 text-xs leading-5 text-(--color-text-muted)'>{audience.description}</p>
                                            {audience.language.length > 0 && (
                                                <p className='mt-3 text-xs leading-5 text-(--color-text)'>
                                                    <span className='font-semibold'>Their language:</span>{' '}
                                                    {audience.language.join(' · ')}
                                                </p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className='rounded-md border border-dashed border-(--color-border) p-4 text-sm text-(--color-text-muted)'>
                                    No audience segment is linked to this unit.
                                </p>
                            )}
                        </DrawerSection>

                        <DrawerSection icon={<Activity className='h-4 w-4' aria-hidden />} title='Indicators'>
                            <dl className='grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-(--color-border) bg-(--color-border) sm:grid-cols-3'>
                                {[
                                    ['Evidence', unit.evidenceCount.toLocaleString()],
                                    ['Source diversity', unit.sourceDiversity?.toLocaleString() ?? 'Unavailable'],
                                    ['Confidence', sentenceCase(unit.confidence)],
                                    ['Frequency', unit.frequency ? sentenceCase(unit.frequency) : 'Unavailable'],
                                    ['Intensity', unit.intensity ? sentenceCase(unit.intensity) : 'Unavailable'],
                                    ['30-day momentum', formatMomentum(unit.momentum30d)],
                                ].map(([label, value]) => (
                                    <div key={label} className='bg-(--color-surface) p-3'>
                                        <dt className='text-[10px] font-medium uppercase tracking-wider text-(--color-text-muted)'>{label}</dt>
                                        <dd className='mt-2 text-sm font-semibold tabular-nums text-(--color-text)'>{value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </DrawerSection>
                    </div>
                </div>

                <footer className='shrink-0 border-t border-(--color-border) bg-(--color-surface) px-5 py-4 sm:px-6'>
                    <div className='flex flex-wrap gap-2'>
                        <button
                            type='button'
                            onClick={() => onPinProblemUnit?.(unit.id, !unit.pinned)}
                            disabled={!onPinProblemUnit}
                            className={SECONDARY_BUTTON}
                        >
                            {unit.pinned ? <PinOff className='h-3.5 w-3.5' aria-hidden /> : <Pin className='h-3.5 w-3.5' aria-hidden />}
                            {unit.pinned ? 'Unpin' : 'Pin'}
                        </button>
                        <button
                            type='button'
                            onClick={() => onRejectProblemUnit?.(unit.id, !unit.rejected)}
                            disabled={!onRejectProblemUnit}
                            className={SECONDARY_BUTTON}
                        >
                            {unit.rejected ? <Check className='h-3.5 w-3.5' aria-hidden /> : <Ban className='h-3.5 w-3.5' aria-hidden />}
                            {unit.rejected ? 'Restore' : 'Reject'}
                        </button>
                        <button
                            type='button'
                            onClick={() => onRequestProblemUnitSplit?.(unit.id)}
                            disabled={!onRequestProblemUnitSplit}
                            className={SECONDARY_BUTTON}
                        >
                            <Split className='h-3.5 w-3.5' aria-hidden />
                            Request split
                        </button>
                        <button
                            type='button'
                            onClick={() => onRequestProblemUnitMerge?.(unit.id)}
                            disabled={!onRequestProblemUnitMerge}
                            className={SECONDARY_BUTTON}
                        >
                            <Combine className='h-3.5 w-3.5' aria-hidden />
                            Request merge
                        </button>
                        <button
                            type='button'
                            onClick={() => onValidateProblemUnit?.(unit.id)}
                            disabled={!onValidateProblemUnit}
                            className='ml-auto inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-(--color-button) px-4 py-2 text-xs font-semibold text-(--color-on-button) transition-colors hover:bg-(--color-button-hover) disabled:cursor-not-allowed disabled:opacity-40'
                        >
                            <ShieldCheck className='h-3.5 w-3.5' aria-hidden />
                            Validate unit
                        </button>
                    </div>
                </footer>
            </aside>
        </div>
    )
}
