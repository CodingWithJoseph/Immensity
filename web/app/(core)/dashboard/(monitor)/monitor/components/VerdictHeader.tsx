import type { ReactNode } from 'react'

export type VerdictTone = 'bad' | 'neutral' | 'good' | 'muted'

const ACCENT: Record<VerdictTone, string> = {
    bad: 'bg-(--color-error)',
    neutral: 'bg-(--color-warning)',
    good: 'bg-(--color-blue)',
    muted: 'bg-(--color-text-muted)',
}

/**
 * The shared lead-in for a monitoring view: a tone-coloured accent bar, an
 * uppercase eyebrow, a one-sentence plain-language verdict, and an optional hero
 * stat on the right. Gives every view the same anatomy — verdict first, numbers
 * second — instead of opening cold with a grid.
 */
export default function VerdictHeader({ eyebrow, verdict, tone, hero, children }: {
    eyebrow: string
    verdict: string
    tone: VerdictTone
    hero?: { value: string; label: string; sub?: string }
    children?: ReactNode
}) {
    return (
        <section className="flex overflow-hidden rounded-md bg-(--color-card)">
            <div className={`w-1 shrink-0 ${ACCENT[tone]}`} aria-hidden />
            <div className="flex min-w-0 flex-1 items-center justify-between gap-4 p-5">
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted)">{eyebrow}</p>
                    <p className="mt-1 text-base font-semibold text-(--color-text)">{verdict}</p>
                </div>
                {hero && (
                    <div className="shrink-0 text-right">
                        <p className="text-2xl font-semibold text-(--color-text)">{hero.value}</p>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted)">{hero.label}</p>
                        {hero.sub && <p className="mt-0.5 text-[11px] text-(--color-text-muted)">{hero.sub}</p>}
                    </div>
                )}
                {children}
            </div>
        </section>
    )
}
