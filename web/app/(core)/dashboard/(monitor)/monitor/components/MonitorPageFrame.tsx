import Link from 'next/link'
import { formatDateTime } from '@/lib/format'
import type { ReactNode } from 'react'
import { monitorViewDescription, monitorViewTitle, type MonitorView } from '@/lib/monitoring/lenses'
import { monitorWarRoomPlan } from '@/lib/monitoring/warRoom'


export default function MonitorPageFrame({
    view,
    pipelineId,
    productName,
    lastSeenAt,
    children,
}: {
    view: MonitorView
    pipelineId: string | null
    productName: string | null
    lastSeenAt: string | null
    children: ReactNode
}) {
    const plan = monitorWarRoomPlan(view, pipelineId)

    return (
        <section className="flex flex-col gap-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="rounded-md border border-(--color-border) bg-(--color-card) px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">Monitor</p>
                            <h1 className="mt-1 text-xl font-semibold text-(--color-text)">{monitorViewTitle(view)}</h1>
                            <p className="mt-1 max-w-3xl text-sm text-(--color-text-muted)">{monitorViewDescription(view)}</p>
                        </div>
                        <div className="rounded-md border border-(--color-border) px-3 py-2 text-xs text-(--color-text-muted)">
                            Last event: <span className="font-medium text-(--color-text)">{formatDateTime(lastSeenAt, 'Not yet')}</span>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-md border border-(--color-border) px-2.5 py-1 text-(--color-text-muted)">Product: <span className="font-medium text-(--color-text)">{productName ?? 'Selected product'}</span></span>
                        <span className="rounded-md border border-(--color-border) px-2.5 py-1 text-(--color-text-muted)">Window: <span className="font-medium text-(--color-text)">Live</span></span>
                        <span className="rounded-md border border-(--color-border) px-2.5 py-1 text-(--color-text-muted)">Release: <span className="font-medium text-(--color-text)">All</span></span>
                        <span className="rounded-md border border-(--color-border) px-2.5 py-1 text-(--color-text-muted)">Platform: <span className="font-medium text-(--color-text)">Web</span></span>
                    </div>
                </div>

                <aside className="rounded-md border border-(--color-border) bg-(--color-card) px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">War room</p>
                    <p className="mt-2 text-sm font-semibold text-(--color-text)">{plan.verdict}</p>
                    <p className="mt-2 text-sm text-(--color-text-muted)">{plan.evidence}</p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-(--color-text-faint)">Next action</p>
                    <p className="mt-1 text-sm text-(--color-text-muted)">{plan.nextAction}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {plan.links.map(link => (
                            <Link
                                key={`${link.label}-${link.href}`}
                                href={link.href}
                                className="rounded-md border border-(--color-border) px-2.5 py-1.5 text-xs font-medium text-(--color-text) hover:bg-(--color-bg)"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </aside>
            </div>

            {children}
        </section>
    )
}
