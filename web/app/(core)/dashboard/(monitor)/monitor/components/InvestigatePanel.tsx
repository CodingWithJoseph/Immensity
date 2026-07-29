'use client'

import { useEffect, useState } from 'react'
import { formatDateTime } from '@/lib/format'
import { fetchJson, ApiData } from '@/lib/fetchJson'
import type { Investigation, InvestigationDetail, InvestigationEntry, MonitoringReport } from '../types'



async function mutate<T>(url: string, method: string, body: unknown): Promise<T | null> {
    return fetchJson<T>(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
}

function downloadMarkdown(filename: string, text: string) {
    const blob = new Blob([text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}

function buildReportBody(inv: Investigation, timeline: InvestigationEntry[]) {
    let md = inv.summary ? `${inv.summary}\n\n` : ''
    md += '## Timeline\n\n'
    for (const e of timeline) {
        const t = formatDateTime(e.createdAt)
        md += e.kind === 'note'
            ? `- ${t} — ${e.body ?? ''}\n`
            : `- ${t} — **${e.kind}** \`${e.refId ?? ''}\`${e.body ? ` — ${e.body}` : ''}\n`
    }
    return md
}

const EVIDENCE_KINDS = ['issue', 'problem', 'session', 'link'] as const

function InvestigationDetailView({ pipelineId, investigationId, onBack, onChanged }: { pipelineId: string; investigationId: string; onBack: () => void; onChanged: () => void }) {
    const [data, setData] = useState<InvestigationDetail | null>(null)
    const [note, setNote] = useState('')
    const [evKind, setEvKind] = useState<typeof EVIDENCE_KINDS[number]>('issue')
    const [evRef, setEvRef] = useState('')
    const [busy, setBusy] = useState(false)

    async function load() {
        const json = await fetchJson<ApiData<InvestigationDetail>>(`/api/monitor/${pipelineId}/investigations/${encodeURIComponent(investigationId)}`)
        setData(json?.data ?? null)
    }
    useEffect(() => { void load() }, [pipelineId, investigationId])

    const base = `/api/monitor/${pipelineId}/investigations/${encodeURIComponent(investigationId)}`

    async function addNote() {
        if (!note.trim()) return
        setBusy(true)
        await mutate(`${base}/entries`, 'POST', { kind: 'note', body: note.trim() })
        setNote('')
        await load()
        setBusy(false)
    }
    async function addEvidence() {
        if (!evRef.trim()) return
        setBusy(true)
        await mutate(`${base}/entries`, 'POST', { kind: evKind, ref_id: evRef.trim() })
        setEvRef('')
        await load()
        setBusy(false)
    }
    async function setStatus(status: 'open' | 'resolved') {
        setBusy(true)
        await mutate(base, 'PATCH', { status })
        await load()
        onChanged()
        setBusy(false)
    }
    async function saveReport() {
        if (!data) return
        setBusy(true)
        const body = buildReportBody(data.investigation, data.timeline)
        await mutate(`/api/monitor/${pipelineId}/reports`, 'POST', { title: data.investigation.title, body, investigation_id: investigationId })
        downloadMarkdown(`${data.investigation.title.replace(/\s+/g, '-').toLowerCase()}.md`, `# ${data.investigation.title}\n\n${body}`)
        onChanged()
        setBusy(false)
    }

    const inv = data?.investigation
    const timeline = data?.timeline ?? []

    return (
        <section className="flex flex-col gap-5">
            <button type="button" onClick={onBack} className="self-start text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted) transition-colors hover:text-(--color-text)">
                ← Back to investigations
            </button>

            {inv && (
                <>
                    <div className="rounded-md bg-(--color-card) p-5">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-(--color-text)">{inv.title}</p>
                            <span className="text-xs text-(--color-text-muted)">{inv.status}</span>
                        </div>
                        {inv.summary && <p className="mt-2 text-xs text-(--color-text-muted)">{inv.summary}</p>}
                        <div className="mt-3 flex flex-wrap gap-2">
                            {inv.status !== 'resolved'
                                ? <button type="button" disabled={busy} onClick={() => setStatus('resolved')} className="rounded-md border border-(--color-border) px-3 py-1.5 text-xs font-medium text-(--color-text) hover:bg-(--color-bg) disabled:opacity-50">Resolve</button>
                                : <button type="button" disabled={busy} onClick={() => setStatus('open')} className="rounded-md border border-(--color-border) px-3 py-1.5 text-xs font-medium text-(--color-text) hover:bg-(--color-bg) disabled:opacity-50">Reopen</button>}
                            <button type="button" disabled={busy} onClick={saveReport} className="rounded-md border border-(--color-border) px-3 py-1.5 text-xs font-medium text-(--color-text) hover:bg-(--color-bg) disabled:opacity-50">Save as report (.md)</button>
                        </div>
                    </div>

                    <section className="rounded-md bg-(--color-card)">
                        <div className="border-b border-(--color-border) px-5 py-4">
                            <p className="text-sm font-semibold text-(--color-text)">Timeline</p>
                        </div>
                        <div className="divide-y divide-(--color-border)">
                            {timeline.length ? timeline.map(e => (
                                <div key={e.id} className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 px-5 py-3 text-sm">
                                    <span className="text-(--color-text-muted)">{formatDateTime(e.createdAt)}</span>
                                    <span className="min-w-0">
                                        {e.kind === 'note'
                                            ? <span className="text-(--color-text)">{e.body}</span>
                                            : <span className="text-(--color-text)"><span className="text-(--color-text-muted)">{e.kind}:</span> {e.refId}{e.body ? ` — ${e.body}` : ''}</span>}
                                    </span>
                                </div>
                            )) : <p className="px-5 py-4 text-sm text-(--color-text-muted)">No entries yet.</p>}
                        </div>
                        <div className="flex flex-col gap-3 border-t border-(--color-border) p-5">
                            <div className="flex gap-2">
                                <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note…" className="flex-1 rounded-md border border-(--color-border) bg-(--color-bg) px-3 py-1.5 text-sm text-(--color-text) placeholder:text-(--color-text-muted)" />
                                <button type="button" disabled={busy} onClick={addNote} className="rounded-md border border-(--color-border) px-3 py-1.5 text-sm font-medium text-(--color-text) hover:bg-(--color-bg) disabled:opacity-50">Note</button>
                            </div>
                            <div className="flex gap-2">
                                <select value={evKind} onChange={e => setEvKind(e.target.value as typeof EVIDENCE_KINDS[number])} className="rounded-md border border-(--color-border) bg-(--color-bg) px-2 py-1.5 text-sm text-(--color-text)">
                                    {EVIDENCE_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
                                </select>
                                <input value={evRef} onChange={e => setEvRef(e.target.value)} placeholder="evidence id / url" className="flex-1 rounded-md border border-(--color-border) bg-(--color-bg) px-3 py-1.5 text-sm text-(--color-text) placeholder:text-(--color-text-muted)" />
                                <button type="button" disabled={busy} onClick={addEvidence} className="rounded-md border border-(--color-border) px-3 py-1.5 text-sm font-medium text-(--color-text) hover:bg-(--color-bg) disabled:opacity-50">Attach</button>
                            </div>
                        </div>
                    </section>
                </>
            )}
        </section>
    )
}

export default function InvestigatePanel({ pipelineId }: { pipelineId: string | null }) {
    const [investigations, setInvestigations] = useState<Investigation[] | null>(null)
    const [reports, setReports] = useState<MonitoringReport[] | null>(null)
    const [selected, setSelected] = useState<string | null>(null)
    const [newTitle, setNewTitle] = useState('')
    const [busy, setBusy] = useState(false)

    async function load() {
        if (!pipelineId) return
        const [inv, rep] = await Promise.all([
            fetchJson<ApiData<{ investigations: Investigation[] }>>(`/api/monitor/${pipelineId}/investigations`),
            fetchJson<ApiData<{ reports: MonitoringReport[] }>>(`/api/monitor/${pipelineId}/reports`),
        ])
        setInvestigations(inv?.data.investigations ?? [])
        setReports(rep?.data.reports ?? [])
    }
    useEffect(() => { void load() }, [pipelineId])

    async function create() {
        if (!pipelineId || !newTitle.trim()) return
        setBusy(true)
        await mutate(`/api/monitor/${pipelineId}/investigations`, 'POST', { title: newTitle.trim() })
        setNewTitle('')
        await load()
        setBusy(false)
    }

    if (selected && pipelineId) {
        return <InvestigationDetailView pipelineId={pipelineId} investigationId={selected} onBack={() => setSelected(null)} onChanged={load} />
    }

    return (
        <section className="flex flex-col gap-6">
            <div className="flex gap-2">
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="New investigation title…" className="flex-1 rounded-md border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm text-(--color-text) placeholder:text-(--color-text-muted)" />
                <button type="button" disabled={busy || !newTitle.trim()} onClick={create} className="rounded-md border border-(--color-border) px-4 py-2 text-sm font-medium text-(--color-text) hover:bg-(--color-bg) disabled:opacity-50">Open investigation</button>
            </div>

            <section className="rounded-md bg-(--color-card)">
                <div className="border-b border-(--color-border) px-5 py-4">
                    <p className="text-sm font-semibold text-(--color-text)">Investigations</p>
                    <p className="mt-1 text-xs text-(--color-text-muted)">Collect evidence and notes into a timeline, then save a report.</p>
                </div>
                <div className="divide-y divide-(--color-border)">
                    {investigations === null && <p className="px-5 py-4 text-sm text-(--color-text-muted)">Loading…</p>}
                    {investigations?.length === 0 && <p className="px-5 py-4 text-sm text-(--color-text-muted)">No investigations yet.</p>}
                    {investigations?.map(inv => (
                        <button key={inv.id} type="button" onClick={() => setSelected(inv.id)} className="flex w-full items-center gap-2 px-5 py-3 text-left text-sm transition-colors hover:bg-(--color-bg)">
                            <span className="min-w-0 flex-1 truncate text-(--color-text)" title={inv.title}>{inv.title}</span>
                            <span className="shrink-0 text-xs text-(--color-text-muted)">{inv.status}</span>
                            <span className="shrink-0 text-xs text-(--color-text-muted)">{formatDateTime(inv.updatedAt)}</span>
                        </button>
                    ))}
                </div>
            </section>

            {reports && reports.length > 0 && (
                <section className="rounded-md bg-(--color-card)">
                    <div className="border-b border-(--color-border) px-5 py-4">
                        <p className="text-sm font-semibold text-(--color-text)">Saved reports</p>
                    </div>
                    <div className="divide-y divide-(--color-border)">
                        {reports.map(r => (
                            <div key={r.id} className="flex items-center gap-2 px-5 py-3 text-sm">
                                <span className="min-w-0 flex-1 truncate text-(--color-text)" title={r.title}>{r.title}</span>
                                <span className="shrink-0 text-xs text-(--color-text-muted)">{formatDateTime(r.createdAt)}</span>
                                <button type="button" onClick={() => downloadMarkdown(`${r.title.replace(/\s+/g, '-').toLowerCase()}.md`, `# ${r.title}\n\n${r.body}`)} className="shrink-0 rounded-md border border-(--color-border) px-2 py-1 text-xs font-medium text-(--color-text) hover:bg-(--color-bg)">Download .md</button>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </section>
    )
}
