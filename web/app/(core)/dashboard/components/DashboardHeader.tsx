'use client'
import { DashboardSummary } from '@/lib/types/dashboard'

export default function DashboardHeader({ summary, firstName }: { summary: DashboardSummary | null; firstName: string }) {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    return (
        <div className='flex flex-col gap-4 rounded-2xl border border-(--color-border) bg-(--color-surface-raised) p-6 shadow-[var(--shadow-sm)]'>
            <div className='flex flex-col gap-1'>
                <p className='text-[11px] font-semibold uppercase tracking-widest text-(--color-accent)'>Mission control</p>
                <h1 className='text-3xl font-semibold tracking-[-0.02em] text-(--color-text)'>Good to see you, {firstName}</h1>
                <p className='text-sm text-(--color-text-muted)'>{today}</p>
            </div>
            {summary && (
                <div className='flex flex-wrap gap-2'>
                    <span className='inline-flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-bg) px-3 py-1.5 text-sm text-(--color-text-muted)'>
                        <span className='h-1.5 w-1.5 rounded-full bg-(--color-accent)' aria-hidden />
                        <span className='font-semibold text-(--color-text)'>{summary.clustersTracked}</span> clusters tracked
                    </span>
                    <span className='inline-flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-bg) px-3 py-1.5 text-sm text-(--color-text-muted)'>
                        <span className='h-1.5 w-1.5 rounded-full bg-(--color-text)' aria-hidden />
                        <span className='font-semibold text-(--color-text)'>{summary.domainsTracked}</span> domains
                    </span>
                </div>
            )}
        </div>
    )
}
