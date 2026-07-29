'use client'

import { useState } from 'react'
import {
    AlertTriangle,
    ArrowRight,
    Ban,
    Check,
    CheckCircle2,
    ChevronRight,
    CircleDashed,
    Clock3,
    Compass,
    FileQuestion,
    GitBranch,
    Info,
    Languages,
    Lightbulb,
    LoaderCircle,
    Pencil,
    Pin,
    RefreshCw,
    Save,
    ShieldCheck,
    TrendingDown,
    TrendingUp,
    Users,
    X,
} from 'lucide-react'
import type {
    SignalAnalysisStatus,
    SignalAssumption,
    SignalCase,
    SignalClaim,
    SignalClaimKind,
    SignalConfidence,
    SignalProblemUnit,
    SignalProblemUnitKind,
    SignalThesis,
} from '../types'
import ProblemUnitDrawer, {
    type SignalProblemUnitTextUpdate,
} from './ProblemUnitDrawer'

export interface SignalOverviewScreenProps {
    signal: SignalCase
    selectedProblemUnitId?: string | null
    onProblemUnitSelect?: (problemUnitId: string | null) => void
    onEditThesis?: (thesis: SignalThesis) => void
    onConfirmThesis?: (thesis: SignalThesis) => void
    onEditProblemUnit?: (problemUnitId: string, update: SignalProblemUnitTextUpdate) => void
    onReclassifyProblemUnit?: (problemUnitId: string, kind: SignalProblemUnitKind) => void
    onPinProblemUnit?: (problemUnitId: string, pinned: boolean) => void
    onRejectProblemUnit?: (problemUnitId: string, rejected: boolean) => void
    onRequestProblemUnitSplit?: (problemUnitId: string) => void
    onRequestProblemUnitMerge?: (problemUnitId: string) => void
    onOpenEvidence?: (evidenceId: string) => void
    onValidateProblemUnit?: (problemUnitId: string) => void
    onValidateProblem?: (problemUnitId: string | null) => void
}

const SECTION =
    'rounded-lg border border-(--color-border) bg-(--color-surface) px-4 py-5 sm:px-6 sm:py-6'
const SECONDARY_BUTTON =
    'inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-(--color-border) px-3 py-2 text-xs font-semibold text-(--color-text) transition-colors hover:bg-(--color-surface-tint) disabled:cursor-not-allowed disabled:opacity-40'

const CLAIM_KIND_LABEL: Record<SignalClaimKind, string> = {
    observed: 'Observed',
    inferred: 'Inferred',
    user_confirmed: 'User confirmed',
}

const CLAIM_KIND_STYLE: Record<SignalClaimKind, string> = {
    observed: 'bg-(--color-blue-soft) text-(--color-info-text)',
    inferred: 'bg-(--color-warning-soft) text-(--color-warning-text)',
    user_confirmed: 'bg-(--color-success-soft) text-(--color-success-text)',
}

const UNIT_KIND_LABEL: Record<SignalProblemUnitKind, string> = {
    cause: 'Cause',
    core_problem: 'Core problem',
    symptom: 'Symptom',
    consequence: 'Consequence',
    workaround: 'Workaround',
}

const UNIT_KIND_STYLE: Record<SignalProblemUnitKind, string> = {
    cause: 'border-(--color-border) bg-(--color-bg) text-(--color-text-muted)',
    core_problem: 'border-(--color-blue) bg-(--color-blue-soft) text-(--color-info-text)',
    symptom: 'border-(--color-warning) bg-(--color-warning-soft) text-(--color-warning-text)',
    consequence: 'border-(--color-error) bg-(--color-error-soft) text-(--color-error-text)',
    workaround: 'border-(--color-success) bg-(--color-success-soft) text-(--color-success-text)',
}

const CONFIDENCE_STYLE: Record<SignalConfidence, string> = {
    low: 'text-(--color-warning-text)',
    medium: 'text-(--color-text-muted)',
    high: 'text-(--color-success-text)',
}

const STATUS_CONTENT: Record<Exclude<SignalAnalysisStatus, 'ready'>, {
    title: string
    description: string
}> = {
    queued: {
        title: 'Analysis queued',
        description: 'The research workspace is waiting to begin. Existing source metrics remain available below.',
    },
    generating: {
        title: 'Analysis in progress',
        description: 'The workspace is being assembled. Completed, deterministic findings remain visible while this runs.',
    },
    stale: {
        title: 'Analysis may be stale',
        description: 'Source material changed after this analysis. Treat findings as a snapshot until it is refreshed.',
    },
    insufficient_evidence: {
        title: 'Evidence is not sufficient yet',
        description: 'Available observations are shown, but the source set is too limited for a dependable problem thesis.',
    },
    failed: {
        title: 'Analysis could not be completed',
        description: 'Previously computed findings and source metrics remain visible where available.',
    },
}

function sentenceCase(value: string): string {
    return value.replaceAll('_', ' ').replace(/^\w/, character => character.toUpperCase())
}

function normalizedPercentage(value: number): number {
    return Math.abs(value) <= 1 ? value * 100 : value
}

function formatStrength(value: number | null): string {
    if (value == null || Number.isNaN(value)) return '—'
    return `${Math.round(Math.max(0, Math.min(100, normalizedPercentage(value))))}%`
}

function formatMomentum(value: number | null): string {
    if (value == null || Number.isNaN(value)) return '—'
    const percentage = normalizedPercentage(value)
    return `${percentage > 0 ? '+' : ''}${Math.round(percentage)}%`
}

function formatFreshness(value: number | null): string {
    if (value == null || Number.isNaN(value)) return '—'
    if (value < 1) return 'Today'
    return `${Math.round(value)}d`
}

function formatCount(value: number | null): string {
    return value == null || Number.isNaN(value) ? '—' : value.toLocaleString()
}

function StatusNotice({ signal }: { signal: SignalCase }) {
    if (signal.status === 'ready') return null
    const content = STATUS_CONTENT[signal.status]
    const isActive = signal.status === 'queued' || signal.status === 'generating'
    const isFailed = signal.status === 'failed'
    const Icon = isActive
        ? LoaderCircle
        : signal.status === 'stale'
            ? RefreshCw
            : AlertTriangle

    return (
        <section
            aria-live={isActive ? 'polite' : undefined}
            role={isFailed ? 'alert' : 'status'}
            className={`rounded-lg border px-4 py-3 ${
                isFailed
                    ? 'border-(--color-error) bg-(--color-error-soft)'
                    : 'border-(--color-warning) bg-(--color-warning-soft)'
            }`}
        >
            <div className='flex items-start gap-3'>
                <Icon
                    className={`mt-0.5 h-4 w-4 shrink-0 ${isActive ? 'animate-spin' : ''} ${
                        isFailed ? 'text-(--color-error-text)' : 'text-(--color-warning-text)'
                    }`}
                    aria-hidden
                />
                <div>
                    <p className={`text-sm font-semibold ${
                        isFailed ? 'text-(--color-error-text)' : 'text-(--color-warning-text)'
                    }`}>
                        {content.title}
                        {signal.progress?.label ? ` · ${signal.progress.label}` : ''}
                    </p>
                    <p className={`mt-1 text-xs leading-5 ${
                        isFailed ? 'text-(--color-error-text)' : 'text-(--color-warning-text)'
                    }`}>
                        {signal.safeError || content.description}
                    </p>
                </div>
            </div>
        </section>
    )
}

function Metric({
    label,
    value,
    description,
    direction,
}: {
    label: string
    value: string
    description: string
    direction?: 'up' | 'down' | 'flat'
}) {
    return (
        <div className='min-w-28 bg-(--color-surface) px-3 py-3 first:rounded-l-md last:rounded-r-md'>
            <dt className='flex items-center gap-1.5 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-(--color-text-muted)'>
                {label}
                <span
                    tabIndex={0}
                    title={description}
                    aria-label={`${label}: ${description}`}
                    className='inline-flex rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus)'
                >
                    <Info className='h-3 w-3' aria-hidden />
                </span>
            </dt>
            <dd className='mt-2 flex items-center gap-1.5 text-lg font-semibold tabular-nums text-(--color-text)'>
                {value}
                {direction === 'up' && <TrendingUp className='h-3.5 w-3.5 text-(--color-success-text)' aria-label='Increasing' />}
                {direction === 'down' && <TrendingDown className='h-3.5 w-3.5 text-(--color-error-text)' aria-label='Decreasing' />}
                {direction === 'flat' && <span className='text-xs text-(--color-text-muted)' aria-label='No change'>—</span>}
            </dd>
        </div>
    )
}

function SignalSnapshot({ signal }: { signal: SignalCase }) {
    const momentum = signal.metrics.momentum30d
    const metrics = [
        {
            label: 'Strength',
            value: formatStrength(signal.metrics.signalStrength),
            description: 'The strength of the problem signal in the analyzed source set; this is not an opportunity score.',
        },
        {
            label: '30d momentum',
            value: formatMomentum(momentum),
            description: 'Change in evidence volume during the latest 30-day period.',
            direction: momentum == null ? undefined : momentum > 0 ? 'up' as const : momentum < 0 ? 'down' as const : 'flat' as const,
        },
        {
            label: 'Freshness',
            value: formatFreshness(signal.metrics.freshnessDays),
            description: 'Days since the most recent evidence in this analysis.',
        },
        {
            label: 'Evidence',
            value: formatCount(signal.metrics.evidenceCount),
            description: 'Evidence records included in the analyzed source set.',
        },
        {
            label: 'Authors',
            value: formatCount(signal.metrics.authorCount),
            description: 'Distinct authors represented in the evidence.',
        },
        {
            label: 'Source diversity',
            value: formatCount(signal.metrics.sourceDiversity),
            description: 'Distinct source contexts represented in the evidence.',
        },
    ]

    return (
        <section aria-labelledby='signal-snapshot-title'>
            <div className='mb-2 flex items-baseline justify-between gap-3'>
                <h2 id='signal-snapshot-title' className='text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted)'>
                    Signal snapshot
                </h2>
                <p className='text-[10px] text-(--color-text-muted)'>Source-set measures</p>
            </div>
            <dl className='overflow-x-auto rounded-md border border-(--color-border) bg-(--color-border)'>
                <div className='grid min-w-180 grid-cols-6 gap-px'>
                    {metrics.map(metric => <Metric key={metric.label} {...metric} />)}
                </div>
            </dl>
        </section>
    )
}

function SectionHeading({
    eyebrow,
    title,
    description,
    icon,
    id,
}: {
    eyebrow: string
    title: string
    description?: string
    icon: React.ReactNode
    id?: string
}) {
    return (
        <header className='mb-5 flex items-start gap-3'>
            <span className='mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-(--color-surface-tint) text-(--color-text-muted)'>
                {icon}
            </span>
            <div>
                <p className='text-[10px] font-semibold uppercase tracking-widest text-(--color-text-muted)'>{eyebrow}</p>
                <h2 id={id} className='mt-1 text-base font-semibold text-(--color-text)'>{title}</h2>
                {description && <p className='mt-1 text-xs leading-5 text-(--color-text-muted)'>{description}</p>}
            </div>
        </header>
    )
}

function ClaimBadge({ kind }: { kind: SignalClaimKind }) {
    return (
        <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-semibold ${CLAIM_KIND_STYLE[kind]}`}>
            {CLAIM_KIND_LABEL[kind]}
        </span>
    )
}

function EmptyResearchState({
    title,
    description,
}: {
    title: string
    description: string
}) {
    return (
        <div className='rounded-md border border-dashed border-(--color-border) bg-(--color-bg) px-4 py-5'>
            <p className='text-sm font-semibold text-(--color-text)'>{title}</p>
            <p className='mt-1 text-xs leading-5 text-(--color-text-muted)'>{description}</p>
        </div>
    )
}

function ThesisSection({
    signal,
    onEditThesis,
    onConfirmThesis,
}: {
    signal: SignalCase
    onEditThesis?: (thesis: SignalThesis) => void
    onConfirmThesis?: (thesis: SignalThesis) => void
}) {
    const thesis = signal.thesis
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState<SignalThesis | null>(thesis)

    const claims = thesis
        ? thesis.claimIds
            .map(id => signal.claims.find(claim => claim.id === id))
            .filter((claim): claim is SignalClaim => Boolean(claim))
        : []

    const updateDraft = (key: keyof SignalThesis, value: string | null) => {
        setDraft(current => current ? { ...current, [key]: value } : current)
    }

    if (!thesis || !draft) {
        const awaiting = signal.status === 'queued' || signal.status === 'generating'
        return (
            <section className={SECTION} aria-labelledby='problem-thesis-title'>
                <SectionHeading
                    id='problem-thesis-title'
                    eyebrow='Working definition'
                    title='Problem thesis'
                    description='A concise, evidence-linked statement of who experiences the problem and why it matters.'
                    icon={<Compass className='h-4 w-4' aria-hidden />}
                />
                <EmptyResearchState
                    title={awaiting ? 'Thesis is being assembled' : 'No defensible thesis yet'}
                    description={awaiting
                        ? 'The thesis will appear here when problem analysis completes.'
                        : 'More evidence is needed before the workspace can state a problem thesis.'}
                />
            </section>
        )
    }

    const field = (
        key: 'statement' | 'audience' | 'context' | 'coreProblem' | 'consequence' | 'workaround',
        label: string,
        rows = 2,
    ) => (
        <label className='block'>
            <span className='text-[11px] font-semibold uppercase tracking-wider text-(--color-text-muted)'>{label}</span>
            <textarea
                rows={rows}
                value={draft[key] ?? ''}
                onChange={event => updateDraft(key, event.target.value || null)}
                className='mt-2 w-full resize-y rounded-md border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm leading-6 text-(--color-text) outline-none focus:border-(--color-focus)'
            />
        </label>
    )

    return (
        <section className={SECTION} aria-labelledby='problem-thesis-title'>
            <div className='flex flex-wrap items-start justify-between gap-4'>
                <SectionHeading
                    id='problem-thesis-title'
                    eyebrow='Working definition'
                    title='Problem thesis'
                    description='Separate observed evidence from inference before confirming the thesis.'
                    icon={<Compass className='h-4 w-4' aria-hidden />}
                />
                <div className='flex items-center gap-2'>
                    <ClaimBadge kind={thesis.confirmed ? 'user_confirmed' : 'inferred'} />
                    {!editing && (
                        <button
                            type='button'
                            onClick={() => {
                                setDraft(thesis)
                                setEditing(true)
                            }}
                            disabled={!onEditThesis}
                            className={SECONDARY_BUTTON}
                        >
                            <Pencil className='h-3.5 w-3.5' aria-hidden />
                            Edit thesis
                        </button>
                    )}
                </div>
            </div>

            {editing ? (
                <div className='rounded-lg border border-(--color-border) bg-(--color-bg) p-4'>
                    <div className='grid gap-4'>
                        {field('statement', 'Thesis statement', 3)}
                        <div className='grid gap-4 sm:grid-cols-2'>
                            {field('audience', 'Audience')}
                            {field('context', 'Context')}
                        </div>
                        {field('coreProblem', 'Core problem')}
                        <div className='grid gap-4 sm:grid-cols-2'>
                            {field('consequence', 'Consequence')}
                            {field('workaround', 'Current workaround')}
                        </div>
                    </div>
                    <div className='mt-4 flex flex-wrap justify-end gap-2'>
                        <button
                            type='button'
                            onClick={() => {
                                setDraft(thesis)
                                setEditing(false)
                            }}
                            className={SECONDARY_BUTTON}
                        >
                            <X className='h-3.5 w-3.5' aria-hidden />
                            Cancel
                        </button>
                        <button
                            type='button'
                            onClick={() => {
                                onEditThesis?.(draft)
                                setEditing(false)
                            }}
                            disabled={!onEditThesis || !draft.statement.trim() || !draft.coreProblem.trim()}
                            className='inline-flex min-h-9 items-center gap-2 rounded-md bg-(--color-button) px-4 py-2 text-xs font-semibold text-(--color-on-button) transition-colors hover:bg-(--color-button-hover) disabled:cursor-not-allowed disabled:opacity-40'
                        >
                            <Save className='h-3.5 w-3.5' aria-hidden />
                            Save changes
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <blockquote className='border-l-2 border-(--color-text) pl-4'>
                        <p className='text-base font-medium leading-7 text-(--color-text)'>{thesis.statement}</p>
                    </blockquote>
                    <dl className='mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2'>
                        {[
                            ['Audience', thesis.audience],
                            ['Context', thesis.context],
                            ['Core problem', thesis.coreProblem],
                            ['Consequence', thesis.consequence],
                            ['Workaround', thesis.workaround],
                        ].map(([label, value]) => (
                            value ? (
                                <div key={label} className={label === 'Core problem' ? 'sm:col-span-2' : ''}>
                                    <dt className='text-[10px] font-semibold uppercase tracking-wider text-(--color-text-muted)'>{label}</dt>
                                    <dd className='mt-1 text-sm leading-6 text-(--color-text)'>{value}</dd>
                                </div>
                            ) : null
                        ))}
                    </dl>
                </>
            )}

            <div className='mt-6 border-t border-(--color-border) pt-5'>
                <div className='mb-3 flex items-center justify-between gap-3'>
                    <h3 className='text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted)'>Research basis</h3>
                    <span className='text-[10px] text-(--color-text-muted)'>{claims.length} linked {claims.length === 1 ? 'claim' : 'claims'}</span>
                </div>
                {claims.length > 0 ? (
                    <ul className='flex flex-col gap-2'>
                        {claims.map(claim => (
                            <li key={claim.id} className='flex items-start gap-3 rounded-md bg-(--color-bg) p-3'>
                                <ClaimBadge kind={claim.kind} />
                                <div className='min-w-0 flex-1'>
                                    <p className={`text-sm leading-5 text-(--color-text) ${claim.rejected ? 'line-through opacity-60' : ''}`}>
                                        {claim.text}
                                    </p>
                                    <p className='mt-1 text-[10px] uppercase tracking-wider text-(--color-text-muted)'>
                                        {sentenceCase(claim.confidence)} confidence · {claim.evidenceIds.length} evidence {claim.evidenceIds.length === 1 ? 'reference' : 'references'}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className='text-xs text-(--color-text-muted)'>No claims are linked to this thesis.</p>
                )}
            </div>

            {!thesis.confirmed && (
                <div className='mt-5 flex flex-col gap-3 rounded-md border border-(--color-success) bg-(--color-success-soft) p-4 sm:flex-row sm:items-center sm:justify-between'>
                    <div>
                        <p className='text-sm font-semibold text-(--color-success-text)'>Ready for researcher confirmation?</p>
                        <p className='mt-1 text-xs leading-5 text-(--color-success-text)'>
                            Confirm only after the statement accurately reflects the linked evidence.
                        </p>
                    </div>
                    <button
                        type='button'
                        onClick={() => onConfirmThesis?.(thesis)}
                        disabled={!onConfirmThesis}
                        className='inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-(--color-button) px-4 py-2 text-xs font-semibold text-(--color-on-button) transition-colors hover:bg-(--color-button-hover) disabled:cursor-not-allowed disabled:opacity-40'
                    >
                        <Check className='h-3.5 w-3.5' aria-hidden />
                        Confirm thesis
                    </button>
                </div>
            )}
        </section>
    )
}

interface ProblemTreeProps {
    units: SignalProblemUnit[]
    parentId: string | null
    trail: Set<string>
    onSelect: (problemUnitId: string) => void
}

function ProblemTree({ units, parentId, trail, onSelect }: ProblemTreeProps) {
    const visibleUnits = units.filter(unit => unit.parentId === parentId && !trail.has(unit.id))
    if (visibleUnits.length === 0) return null

    return (
        <ul className={parentId ? 'ml-4 border-l border-(--color-border) pl-3 sm:ml-7 sm:pl-4' : 'flex flex-col gap-2'}>
            {visibleUnits.map(unit => {
                const nextTrail = new Set(trail)
                nextTrail.add(unit.id)
                const momentum = unit.momentum30d
                return (
                    <li key={unit.id} className={parentId ? 'py-1' : undefined}>
                        <button
                            type='button'
                            onClick={() => onSelect(unit.id)}
                            aria-label={`Open ${unit.title}, ${UNIT_KIND_LABEL[unit.kind]}`}
                            className={`group w-full rounded-md border border-(--color-border) bg-(--color-surface) p-3 text-left transition-colors hover:border-(--color-focus) hover:bg-(--color-surface-tint) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus) ${unit.rejected ? 'opacity-60' : ''}`}
                        >
                            <span className='flex items-start gap-3'>
                                <span className={`mt-0.5 inline-flex shrink-0 rounded-md border px-2 py-1 text-[10px] font-semibold ${UNIT_KIND_STYLE[unit.kind]}`}>
                                    {UNIT_KIND_LABEL[unit.kind]}
                                </span>
                                <span className='min-w-0 flex-1'>
                                    <span className={`block text-sm font-semibold leading-5 text-(--color-text) ${unit.rejected ? 'line-through' : ''}`}>
                                        {unit.title}
                                    </span>
                                    {unit.description && (
                                        <span className='mt-1 line-clamp-2 block text-xs leading-5 text-(--color-text-muted)'>
                                            {unit.description}
                                        </span>
                                    )}
                                    <span className='mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-wider text-(--color-text-muted)'>
                                        <span>{unit.evidenceCount} evidence</span>
                                        <span>{unit.sourceDiversity == null ? 'Sources unknown' : `${unit.sourceDiversity} sources`}</span>
                                        <span className={CONFIDENCE_STYLE[unit.confidence]}>{sentenceCase(unit.confidence)} confidence</span>
                                        <span className={momentum != null && momentum > 0 ? 'text-(--color-success-text)' : momentum != null && momentum < 0 ? 'text-(--color-error-text)' : ''}>
                                            {formatMomentum(momentum)} 30d
                                        </span>
                                        {unit.pinned && <span className='inline-flex items-center gap-1 text-(--color-info-text)'><Pin className='h-3 w-3' aria-hidden />Pinned</span>}
                                        {unit.rejected && <span className='inline-flex items-center gap-1 text-(--color-error-text)'><Ban className='h-3 w-3' aria-hidden />Rejected</span>}
                                    </span>
                                </span>
                                <ChevronRight className='mt-1 h-4 w-4 shrink-0 text-(--color-text-muted) transition-transform group-hover:translate-x-0.5' aria-hidden />
                            </span>
                        </button>
                        <ProblemTree units={units} parentId={unit.id} trail={nextTrail} onSelect={onSelect} />
                    </li>
                )
            })}
        </ul>
    )
}

function ProblemAnatomy({
    units,
    onSelect,
}: {
    units: SignalProblemUnit[]
    onSelect: (problemUnitId: string) => void
}) {
    const ids = new Set(units.map(unit => unit.id))
    const normalizedUnits = units.map(unit => (
        unit.parentId && !ids.has(unit.parentId) ? { ...unit, parentId: null } : unit
    ))
    const roots = normalizedUnits.filter(unit => unit.parentId === null)
    const treeUnits = roots.length > 0
        ? normalizedUnits
        : normalizedUnits.map(unit => ({ ...unit, parentId: null }))

    return (
        <section className={SECTION} aria-labelledby='problem-anatomy-title'>
            <SectionHeading
                id='problem-anatomy-title'
                eyebrow='Structure'
                title='Problem anatomy'
                description='A hierarchy of causes, the core problem, observable symptoms, consequences, and workarounds.'
                icon={<GitBranch className='h-4 w-4' aria-hidden />}
            />
            {units.length > 0 ? (
                <ProblemTree units={treeUnits} parentId={null} trail={new Set()} onSelect={onSelect} />
            ) : (
                <EmptyResearchState
                    title='No problem units mapped'
                    description='The evidence has not yet been decomposed into a problem hierarchy.'
                />
            )}
        </section>
    )
}

function AudienceSection({ signal }: { signal: SignalCase }) {
    return (
        <section className={SECTION} aria-labelledby='audience-understanding-title'>
            <SectionHeading
                id='audience-understanding-title'
                eyebrow='People and language'
                title='Audience understanding'
                description='Who experiences the problem, how they describe it, and where they can be reached.'
                icon={<Users className='h-4 w-4' aria-hidden />}
            />
            {signal.audiences.length > 0 ? (
                <div className='flex flex-col gap-4'>
                    {signal.audiences.map(audience => (
                        <article key={audience.id} className='rounded-lg border border-(--color-border) p-4'>
                            <div className='flex flex-wrap items-start justify-between gap-3'>
                                <div>
                                    <h3 className='text-sm font-semibold text-(--color-text)'>{audience.name}</h3>
                                    <p className='mt-1 text-xs leading-5 text-(--color-text-muted)'>{audience.description}</p>
                                </div>
                                <ClaimBadge kind={audience.kind} />
                            </div>
                            <div className='mt-4 grid gap-4 md:grid-cols-2'>
                                <div>
                                    <p className='flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-(--color-text-muted)'>
                                        <Languages className='h-3.5 w-3.5' aria-hidden />
                                        Repeated language
                                    </p>
                                    {audience.language.length > 0 ? (
                                        <ul className='mt-2 flex flex-col gap-1.5'>
                                            {audience.language.map((phrase, index) => (
                                                <li key={`${phrase}-${index}`} className='border-l-2 border-(--color-border) pl-3 text-xs italic leading-5 text-(--color-text)'>
                                                    “{phrase}”
                                                </li>
                                            ))}
                                        </ul>
                                    ) : <p className='mt-2 text-xs text-(--color-text-muted)'>No repeated language captured.</p>}
                                </div>
                                <div className='grid grid-cols-2 gap-4'>
                                    <div>
                                        <p className='text-[10px] font-semibold uppercase tracking-wider text-(--color-text-muted)'>Communities</p>
                                        <p className='mt-2 text-xs leading-5 text-(--color-text)'>
                                            {audience.communities.length > 0 ? audience.communities.join(' · ') : 'Unknown'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className='text-[10px] font-semibold uppercase tracking-wider text-(--color-text-muted)'>Reach channels</p>
                                        <p className='mt-2 text-xs leading-5 text-(--color-text)'>
                                            {audience.reachChannels.length > 0 ? audience.reachChannels.join(' · ') : 'Unknown'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            {audience.unknowns.length > 0 && (
                                <div className='mt-4 rounded-md bg-(--color-warning-soft) px-3 py-2.5'>
                                    <p className='text-[10px] font-semibold uppercase tracking-wider text-(--color-warning-text)'>Unknowns</p>
                                    <ul className='mt-1.5 list-disc space-y-1 pl-4 text-xs leading-5 text-(--color-warning-text)'>
                                        {audience.unknowns.map((unknown, index) => <li key={`${unknown}-${index}`}>{unknown}</li>)}
                                    </ul>
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            ) : (
                <EmptyResearchState
                    title='Audience is not yet clear'
                    description='No observed or inferred audience segment has enough support to show.'
                />
            )}
        </section>
    )
}

function AlternativesSection({ signal }: { signal: SignalCase }) {
    return (
        <section className={SECTION} aria-labelledby='alternatives-title'>
            <SectionHeading
                id='alternatives-title'
                eyebrow='Current behavior'
                title='Alternatives and workarounds'
                description='What people do today and where those approaches fall short.'
                icon={<RefreshCw className='h-4 w-4' aria-hidden />}
            />
            {signal.alternatives.length > 0 ? (
                <ul className='divide-y divide-(--color-border)'>
                    {signal.alternatives.map(alternative => (
                        <li key={alternative.id} className='grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(150px,0.7fr)_1fr_1fr]'>
                            <div>
                                <p className='text-sm font-semibold text-(--color-text)'>{alternative.name}</p>
                                <p className='mt-1 text-[10px] font-medium uppercase tracking-wider text-(--color-text-muted)'>
                                    {sentenceCase(alternative.category)}
                                </p>
                            </div>
                            <div>
                                <p className='text-[10px] font-semibold uppercase tracking-wider text-(--color-text-muted)'>Why it is used</p>
                                <p className='mt-1 text-xs leading-5 text-(--color-text)'>{alternative.reasonUsed ?? 'Not established'}</p>
                            </div>
                            <div>
                                <p className='text-[10px] font-semibold uppercase tracking-wider text-(--color-text-muted)'>Weakness</p>
                                <p className='mt-1 text-xs leading-5 text-(--color-text)'>{alternative.weakness ?? 'Not established'}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <EmptyResearchState
                    title='No alternatives documented'
                    description='Current workarounds and competing behaviors have not been established.'
                />
            )}
        </section>
    )
}

function EvidenceStrength({ strength }: { strength: SignalConfidence }) {
    const width = strength === 'high' ? 'w-full' : strength === 'medium' ? 'w-2/3' : 'w-1/3'
    return (
        <div className='min-w-24' aria-label={`${sentenceCase(strength)} evidence strength`}>
            <div className='h-1.5 overflow-hidden rounded-sm bg-(--color-border)'>
                <span className={`block h-full bg-(--color-text) ${width}`} />
            </div>
            <p className='mt-1 text-[10px] font-medium text-(--color-text-muted)'>{sentenceCase(strength)}</p>
        </div>
    )
}

function AssumptionRow({ assumption }: { assumption: SignalAssumption }) {
    return (
        <li className={`rounded-md border p-4 ${
            assumption.resolved
                ? 'border-(--color-success) bg-(--color-success-soft)'
                : 'border-(--color-border) bg-(--color-surface)'
        }`}>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-start'>
                <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md ${
                    assumption.resolved
                        ? 'bg-(--color-success) text-white'
                        : 'bg-(--color-surface-tint) text-(--color-text-muted)'
                }`}>
                    {assumption.resolved
                        ? <Check className='h-3.5 w-3.5' aria-hidden />
                        : <FileQuestion className='h-3.5 w-3.5' aria-hidden />}
                </span>
                <div className='min-w-0 flex-1'>
                    <div className='flex flex-wrap items-center gap-2'>
                        <p className='text-sm font-semibold leading-5 text-(--color-text)'>{assumption.question}</p>
                        <span className='rounded-md bg-(--color-surface-tint) px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-(--color-text-muted)'>
                            {sentenceCase(assumption.category)}
                        </span>
                        {assumption.resolved && (
                            <span className='text-[10px] font-semibold uppercase tracking-wider text-(--color-success-text)'>Resolved</span>
                        )}
                    </div>
                    <p className='mt-2 text-xs leading-5 text-(--color-text-muted)'>{assumption.whyItMatters}</p>
                    {assumption.resolutionEvidence && (
                        <p className='mt-2 text-xs leading-5 text-(--color-text)'>
                            <span className='font-semibold'>Resolution evidence:</span> {assumption.resolutionEvidence}
                        </p>
                    )}
                </div>
                <EvidenceStrength strength={assumption.evidenceStrength} />
            </div>
        </li>
    )
}

function AssumptionsSection({ signal }: { signal: SignalCase }) {
    const unresolved = signal.assumptions.filter(assumption => !assumption.resolved)
    const resolved = signal.assumptions.filter(assumption => assumption.resolved)

    return (
        <section className={SECTION} aria-labelledby='assumptions-title'>
            <SectionHeading
                id='assumptions-title'
                eyebrow='Research gaps'
                title='Assumptions and unknowns'
                description={`${unresolved.length} unresolved · ${resolved.length} resolved`}
                icon={<FileQuestion className='h-4 w-4' aria-hidden />}
            />
            {signal.assumptions.length > 0 ? (
                <ul className='flex flex-col gap-2'>
                    {[...unresolved, ...resolved].map(assumption => (
                        <AssumptionRow key={assumption.id} assumption={assumption} />
                    ))}
                </ul>
            ) : (
                <EmptyResearchState
                    title='No assumptions recorded'
                    description='Research gaps have not yet been converted into explicit questions.'
                />
            )}
        </section>
    )
}

function RecommendedFocusSection({
    signal,
    onValidateProblem,
}: {
    signal: SignalCase
    onValidateProblem?: (problemUnitId: string | null) => void
}) {
    const focus = signal.recommendedFocus
    return (
        <section className='rounded-lg border border-(--color-text) bg-(--color-surface) px-4 py-5 sm:px-6 sm:py-6' aria-labelledby='recommended-focus-title'>
            <SectionHeading
                id='recommended-focus-title'
                eyebrow='Recommended next focus'
                title={focus?.title ?? 'Choose the next validation focus'}
                description={focus?.rationale ?? 'A recommendation will appear when the evidence supports a focused next step.'}
                icon={<Lightbulb className='h-4 w-4' aria-hidden />}
            />
            {focus ? (
                <>
                    <div className='grid gap-5 md:grid-cols-2'>
                        <div>
                            <h3 className='flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-(--color-success-text)'>
                                <CheckCircle2 className='h-3.5 w-3.5' aria-hidden />
                                Supported
                            </h3>
                            {focus.supported.length > 0 ? (
                                <ul className='mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-(--color-text)'>
                                    {focus.supported.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
                                </ul>
                            ) : <p className='mt-2 text-xs text-(--color-text-muted)'>No strong support recorded.</p>}
                        </div>
                        <div>
                            <h3 className='flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-(--color-warning-text)'>
                                <AlertTriangle className='h-3.5 w-3.5' aria-hidden />
                                Risky or unknown
                            </h3>
                            {focus.risky.length > 0 ? (
                                <ul className='mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-(--color-text)'>
                                    {focus.risky.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
                                </ul>
                            ) : <p className='mt-2 text-xs text-(--color-text-muted)'>No material risks recorded.</p>}
                        </div>
                    </div>
                    <div className='mt-5 flex flex-col gap-3 rounded-md bg-(--color-bg) p-4 sm:flex-row sm:items-center sm:justify-between'>
                        <div>
                            <p className='text-[10px] font-semibold uppercase tracking-wider text-(--color-text-muted)'>Suggested validation step</p>
                            <p className='mt-1 text-sm leading-6 text-(--color-text)'>{focus.suggestedValidationStep}</p>
                        </div>
                        <button
                            type='button'
                            onClick={() => onValidateProblem?.(focus.problemUnitId)}
                            disabled={!onValidateProblem}
                            className='inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-(--color-button) px-4 py-2 text-sm font-semibold text-(--color-on-button) transition-colors hover:bg-(--color-button-hover) disabled:cursor-not-allowed disabled:opacity-40'
                        >
                            <ShieldCheck className='h-4 w-4' aria-hidden />
                            Validate this problem
                            <ArrowRight className='h-4 w-4' aria-hidden />
                        </button>
                    </div>
                </>
            ) : (
                <div className='flex items-center gap-2 text-xs text-(--color-text-muted)'>
                    <CircleDashed className='h-4 w-4' aria-hidden />
                    No recommended focus is available yet.
                </div>
            )}
        </section>
    )
}

export default function SignalOverviewScreen({
    signal,
    selectedProblemUnitId,
    onProblemUnitSelect,
    onEditThesis,
    onConfirmThesis,
    onEditProblemUnit,
    onReclassifyProblemUnit,
    onPinProblemUnit,
    onRejectProblemUnit,
    onRequestProblemUnitSplit,
    onRequestProblemUnitMerge,
    onOpenEvidence,
    onValidateProblemUnit,
    onValidateProblem,
}: SignalOverviewScreenProps) {
    const isControlled = selectedProblemUnitId !== undefined
    const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null)
    const activeId = isControlled ? selectedProblemUnitId : internalSelectedId
    const selectedUnit = signal.problemUnits.find(unit => unit.id === activeId) ?? null

    const selectUnit = (problemUnitId: string | null) => {
        if (!isControlled) setInternalSelectedId(problemUnitId)
        onProblemUnitSelect?.(problemUnitId)
    }

    return (
        <>
            <main className='mx-auto flex w-full max-w-5xl flex-col gap-4 pb-12'>
                <header className='px-1 pb-1'>
                    <div className='flex flex-wrap items-start justify-between gap-4'>
                        <div>
                            <p className='text-[10px] font-semibold uppercase tracking-widest text-(--color-text-muted)'>
                                {signal.project.clusterName ?? signal.project.projectName}
                            </p>
                            <h1 className='mt-1 text-xl font-semibold tracking-tight text-(--color-text)'>Signal overview</h1>
                            <p className='mt-1 max-w-2xl text-xs leading-5 text-(--color-text-muted)'>
                                A research record of the problem, its evidence, audience, and open questions.
                            </p>
                        </div>
                        <div className='flex items-center gap-2 text-[10px] text-(--color-text-muted)'>
                            <Clock3 className='h-3.5 w-3.5' aria-hidden />
                            {signal.project.analyzedAt
                                ? `Analyzed ${new Date(signal.project.analyzedAt).toLocaleDateString()}`
                                : 'Not yet analyzed'}
                        </div>
                    </div>
                </header>

                <StatusNotice signal={signal} />
                <SignalSnapshot signal={signal} />
                <ThesisSection signal={signal} onEditThesis={onEditThesis} onConfirmThesis={onConfirmThesis} />
                <ProblemAnatomy units={signal.problemUnits} onSelect={problemUnitId => selectUnit(problemUnitId)} />
                <AudienceSection signal={signal} />
                <AlternativesSection signal={signal} />
                <AssumptionsSection signal={signal} />
                <RecommendedFocusSection signal={signal} onValidateProblem={onValidateProblem} />
            </main>

            {selectedUnit && (
                <ProblemUnitDrawer
                    key={selectedUnit.id}
                    unit={selectedUnit}
                    problemUnits={signal.problemUnits}
                    claims={signal.claims}
                    evidence={signal.evidence}
                    audiences={signal.audiences}
                    onClose={() => selectUnit(null)}
                    onSelectProblemUnit={problemUnitId => selectUnit(problemUnitId)}
                    onEditProblemUnit={onEditProblemUnit}
                    onReclassifyProblemUnit={onReclassifyProblemUnit}
                    onPinProblemUnit={onPinProblemUnit}
                    onRejectProblemUnit={onRejectProblemUnit}
                    onRequestProblemUnitSplit={onRequestProblemUnitSplit}
                    onRequestProblemUnitMerge={onRequestProblemUnitMerge}
                    onOpenEvidence={onOpenEvidence}
                    onValidateProblemUnit={onValidateProblemUnit}
                />
            )}
        </>
    )
}
