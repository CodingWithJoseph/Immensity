'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useDialogFocus } from '@/app/(core)/dashboard/hooks/useDialogFocus'
import { PipelineCard } from '@/lib/types/cluster'
import { TIMELINE_OPTIONS, timelineMilestones, formatTimelineDate } from '@/lib/timeline'

interface Props {
    pipelineId: string
    // Cluster name, used to pre-fill the editable project name in step 1.
    initialName: string
    onClose: () => void
    // Called after a successful save (timeline set or skipped) with the
    // updated card, so callers can refresh local state.
    onSaved?: (card: PipelineCard) => void
}

async function patchPipeline(pipelineId: string, body: Record<string, unknown>): Promise<PipelineCard | null> {
    const res = await fetch(`/api/pipeline/${pipelineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error('save failed')
    const json = (await res.json()) as { data: PipelineCard }
    return json.data ?? null
}

function TimelineOptionCard({ days, label, selected, onSelect }: {
    days: number
    label: string
    selected: boolean
    onSelect: () => void
}) {
    // Concrete dates use today as the timeline start (same as the server will).
    const { discoveryEnd, launchTarget } = timelineMilestones(new Date(), days)

    return (
        <button
            type="button"
            onClick={onSelect}
            aria-pressed={selected}
            className={`group relative flex flex-col gap-1 rounded-xl border p-4 text-left transition-all duration-150 ${
                selected
                    ? 'border-(--color-accent) bg-(--color-accent-soft) shadow-[var(--shadow-sm)]'
                    : 'border-(--color-border) bg-(--color-surface) hover:-translate-y-0.5 hover:border-(--color-border-strong) hover:shadow-[var(--shadow-sm)]'
            }`}>
            <span className="flex items-center justify-between">
                <span className="text-sm font-semibold text-(--color-text)">{label}</span>
                <span className={`grid h-4 w-4 place-items-center rounded-full border transition-colors ${
                    selected ? 'border-(--color-accent) bg-(--color-accent) text-(--color-white)' : 'border-(--color-border-strong) text-transparent'
                }`}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M20 6 9 17l-5-5" /></svg>
                </span>
            </span>
            <span className="text-xs leading-relaxed text-(--color-text-muted)">
                Discovery ends <span className="font-medium text-(--color-text)">{formatTimelineDate(discoveryEnd)}</span>
                <span className="px-1 opacity-40">·</span>
                Launch <span className="font-medium text-(--color-text)">{formatTimelineDate(launchTarget)}</span>
            </span>
        </button>
    )
}

function StepRail({ step }: { step: 1 | 2 }) {
    return (
        <div className="flex items-center gap-1.5" aria-hidden>
            <span className={`h-1 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-(--color-accent)' : 'bg-(--color-border)'}`} />
            <span className={`h-1 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-(--color-accent)' : 'bg-(--color-border)'}`} />
        </div>
    )
}

export default function ProjectSetupModal({ pipelineId, initialName, onClose, onSaved }: Props) {
    const dialogRef = useDialogFocus<HTMLDivElement>()
    const [step, setStep] = useState<1 | 2>(1)
    const [name, setName] = useState(initialName)
    const [selectedDays, setSelectedDays] = useState<number | null>(null)
    const [saving, setSaving] = useState(false)

    const projectName = name.trim() || initialName

    async function handleSkip() {
        setSaving(true)
        try {
            const card = await patchPipeline(pipelineId, { project_name: projectName })
            if (card) onSaved?.(card)
            onClose()
        } catch {
            toast.error('Could not save the project name. Please try again.')
            setSaving(false)
        }
    }

    async function handleSetTimeline() {
        if (!selectedDays) return
        setSaving(true)
        try {
            const card = await patchPipeline(pipelineId, { project_name: projectName, timeline_days: selectedDays })
            if (card) onSaved?.(card)
            onClose()
        } catch {
            toast.error('Could not save the timeline. Please try again.')
            setSaving(false)
        }
    }

    return (
        <div className="pf-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                tabIndex={-1}
                aria-label="Set up your project"
                className="pf-pop-in w-full max-w-md overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface-raised) shadow-[var(--shadow-lift)] outline-none">
                <div className="flex flex-col gap-5 p-6">
                    <StepRail step={step} />

                    {step === 1 ? (
                        <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-(--color-text-faint)">New project · Step 1 of 2</span>
                                <h2 className="text-xl font-semibold tracking-tight text-(--color-text)">Name your project</h2>
                                <p className="text-sm text-(--color-text-muted)">Rename it anytime — it defaults to the cluster name.</p>
                            </div>

                            <input
                                autoFocus
                                value={name}
                                onChange={e => setName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') setStep(2) }}
                                placeholder="Project name"
                                className="w-full rounded-xl border border-(--color-border) bg-(--color-surface) px-3.5 py-2.5 text-sm text-(--color-text) shadow-[var(--shadow-sm)] transition-shadow placeholder:text-(--color-text-faint) focus:border-(--color-accent) focus:outline-none focus:ring-2 focus:ring-(--color-accent-soft)"
                            />

                            <div className="flex items-center justify-end">
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-(--color-button) px-4 py-2.5 text-sm font-semibold text-(--color-on-button) transition-all hover:bg-(--color-button-hover) active:scale-[0.98]">
                                    Continue
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m9 18 6-6-6-6" /></svg>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-(--color-text-faint)">Launch timeline · Step 2 of 2</span>
                                <h2 className="text-xl font-semibold tracking-tight text-(--color-text)">When do you want to launch?</h2>
                                <p className="text-sm text-(--color-text-muted)">Optional — pick a window to pace discovery and build.</p>
                            </div>

                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                {TIMELINE_OPTIONS.map(option => (
                                    <TimelineOptionCard
                                        key={option.days}
                                        days={option.days}
                                        label={option.label}
                                        selected={selectedDays === option.days}
                                        onSelect={() => setSelectedDays(option.days)}
                                    />
                                ))}
                            </div>

                            <div className="flex items-center justify-between gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={handleSkip}
                                    disabled={saving}
                                    className="text-sm font-medium text-(--color-text-muted) underline-offset-4 transition-colors hover:text-(--color-text) hover:underline disabled:opacity-50">
                                    Skip for now
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSetTimeline}
                                    disabled={saving || !selectedDays}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-(--color-button) px-4 py-2.5 text-sm font-semibold text-(--color-on-button) transition-all hover:bg-(--color-button-hover) active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100">
                                    {saving ? 'Saving…' : 'Set timeline'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
