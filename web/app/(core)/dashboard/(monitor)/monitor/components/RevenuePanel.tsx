'use client'

import { useState } from 'react'
import { formatDateTime } from '@/lib/format'
import Link from 'next/link'
import type { RevenueMetrics, RevenueSource } from '../types'

interface Props {
    revenue: RevenueMetrics | null
    source: RevenueSource | null
    saving: boolean
    syncing?: boolean
    syncError?: string | null
    setupHref?: string
    onConnectStripe?: () => void
    onSyncRevenue?: () => void
}

function money(cents: number | null | undefined) {
    if (cents == null) return '$0'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100)
}

function percent(value: number | null | undefined) {
    if (value == null) return '—'
    return `${Math.round(value * 1000) / 10}%`
}

function multiple(value: number | null | undefined) {
    if (value == null) return '—'
    return `${value}×`
}

function months(value: number | null | undefined) {
    if (value == null) return '—'
    return `${value} mo`
}

// ── plain-language verdicts: every number answers "is this good?" ──────────────
type Tone = 'good' | 'ok' | 'bad' | 'neutral'

function toneText(tone: Tone) {
    return tone === 'good' ? 'text-(--color-blue)' : tone === 'bad' ? 'text-(--color-error)' : tone === 'ok' ? 'text-(--color-warning)' : 'text-(--color-text)'
}
function toneDot(tone: Tone) {
    return tone === 'good' ? 'bg-(--color-blue)' : tone === 'bad' ? 'bg-(--color-error)' : tone === 'ok' ? 'bg-(--color-warning)' : 'bg-(--color-border-strong)'
}

function verdict(key: 'nrr' | 'netChurn' | 'quick' | 'grr' | 'grossChurn', v: number | null): { tone: Tone; note: string } {
    if (v == null) return { tone: 'neutral', note: 'Not enough history yet.' }
    switch (key) {
        case 'nrr':
            if (v >= 1.1) return { tone: 'good', note: 'Existing customers are net-expanding — revenue compounds without new sales.' }
            if (v >= 1.0) return { tone: 'ok', note: 'Holding steady — expansion roughly offsets losses.' }
            return { tone: 'bad', note: 'Leaky — existing revenue shrinks unless you keep adding new customers.' }
        case 'netChurn':
            if (v <= 0) return { tone: 'good', note: 'Net-negative churn — expansion outpaces every loss.' }
            if (v <= 0.02) return { tone: 'ok', note: 'A small monthly leak; keep an eye on it.' }
            return { tone: 'bad', note: 'Existing revenue is leaking faster than it expands.' }
        case 'quick':
            if (v >= 4) return { tone: 'good', note: 'Efficient growth — gains far outweigh losses.' }
            if (v >= 2) return { tone: 'ok', note: 'Workable, but losses are taking a real bite.' }
            return { tone: 'bad', note: 'Losses are eating most of your growth.' }
        case 'grr':
            if (v >= 0.9) return { tone: 'good', note: 'You keep most revenue before any expansion.' }
            if (v >= 0.8) return { tone: 'ok', note: 'A noticeable floor leak.' }
            return { tone: 'bad', note: 'You lose a large share of revenue each period.' }
        case 'grossChurn':
            if (v <= 0.02) return { tone: 'good', note: 'Very low gross churn.' }
            if (v <= 0.05) return { tone: 'ok', note: 'Moderate gross churn.' }
            return { tone: 'bad', note: 'High gross churn — retention needs work.' }
    }
}

function Info({ text }: { text: string }) {
    return (
        <span title={text} className="ml-1 cursor-help text-(--color-text-faint)" aria-label={text}>ⓘ</span>
    )
}

function VerdictCard({ label, value, tone, note, info }: { label: string; value: string; tone: Tone; note: string; info?: string }) {
    return (
        <div className="flex flex-col gap-1.5 rounded-md border border-(--color-border) bg-(--color-bg) p-4">
            <p className="flex items-center text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted)">
                <span className={`mr-2 inline-block h-1.5 w-1.5 rounded-full ${toneDot(tone)}`} aria-hidden />
                {label}
                {info ? <Info text={info} /> : null}
            </p>
            <p className={`text-2xl font-semibold tracking-[-0.01em] ${toneText(tone)}`}>{value}</p>
            <p className="text-xs leading-snug text-(--color-text-muted)">{note}</p>
        </div>
    )
}

function StatTile({ label, value, hint, estimated }: { label: string; value: string; hint?: string; estimated?: boolean }) {
    return (
        <div className="rounded-md border border-(--color-border) bg-(--color-bg) p-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted)">
                {label}
                {estimated ? <span className="ml-2 rounded-full border border-(--color-border) px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-(--color-text-muted)">est</span> : null}
            </p>
            <p className="mt-2 text-2xl font-semibold text-(--color-text)">{value}</p>
            {hint ? <p className="mt-1 text-xs text-(--color-text-muted)">{hint}</p> : null}
        </div>
    )
}

// ── MRR waterfall: starting → +gains → −losses → current, at a glance ──────────
function Waterfall({ starting, current, gains, losses }: {
    starting: number
    current: number
    gains: { label: string; value: number }[]
    losses: { label: string; value: number }[]
}) {
    const gained = gains.reduce((s, g) => s + g.value, 0)
    const lost = losses.reduce((s, l) => s + l.value, 0)
    const scale = Math.max(1, starting, current, gained, lost)
    const seg = (v: number) => `${Math.max(v > 0 ? 3 : 0, (v / scale) * 100)}%`

    return (
        <div className="flex flex-col gap-3">
            {/* bridge tiles */}
            <div className="flex flex-wrap items-stretch gap-2">
                <BridgeTile label="Starting" value={money(starting)} kind="base" />
                {gains.map(g => g.value > 0 && <BridgeTile key={g.label} label={g.label} value={`+${money(g.value)}`} kind="add" />)}
                {losses.map(l => l.value > 0 && <BridgeTile key={l.label} label={l.label} value={`−${money(l.value)}`} kind="sub" />)}
                <BridgeTile label="Current" value={money(current)} kind="total" />
            </div>
            {/* proportional gained vs lost bars */}
            <div className="flex flex-col gap-2">
                <BarRow label={`Gained ${money(gained)}`} tone="add">
                    {gains.filter(g => g.value > 0).map(g => (
                        <span key={g.label} title={`${g.label}: ${money(g.value)}`} className="h-full" style={{ width: seg(g.value), backgroundColor: 'var(--color-blue)' }} />
                    ))}
                </BarRow>
                <BarRow label={`Lost ${money(lost)}`} tone="sub">
                    {losses.filter(l => l.value > 0).map(l => (
                        <span key={l.label} title={`${l.label}: ${money(l.value)}`} className="h-full" style={{ width: seg(l.value), backgroundColor: 'var(--color-error)' }} />
                    ))}
                </BarRow>
            </div>
        </div>
    )
}

function BridgeTile({ label, value, kind }: { label: string; value: string; kind: 'base' | 'add' | 'sub' | 'total' }) {
    const valueColor = kind === 'add' ? 'text-(--color-blue)' : kind === 'sub' ? 'text-(--color-error)' : 'text-(--color-text)'
    const border = kind === 'total' ? 'border-(--color-border-strong)' : 'border-(--color-border)'
    return (
        <div className={`flex min-w-[88px] flex-1 flex-col gap-0.5 rounded-md border ${border} bg-(--color-bg) px-3 py-2`}>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-(--color-text-muted)">{label}</span>
            <span className={`text-sm font-semibold ${valueColor}`}>{value}</span>
        </div>
    )
}

function BarRow({ label, children }: { label: string; tone: 'add' | 'sub'; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-xs text-(--color-text-muted)">{label}</span>
            <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-(--color-surface-tint)">{children}</div>
        </div>
    )
}

function statusCopy(source: RevenueSource | null) {
    if (!source) return { label: 'Not connected', detail: 'Connect Stripe to monitor product revenue.' }
    if (source.status === 'connected') return { label: 'Connected', detail: source.lastSyncedAt ? 'Revenue data is synced for this product.' : 'Stripe is connected. Sync revenue to update these metrics.' }
    if (source.status === 'needs_attention') return { label: 'Needs attention', detail: 'Reconnect or review this revenue source.' }
    return { label: 'Ready to connect', detail: 'Stripe is staged here. Continue to Stripe to authorize revenue access.' }
}


export default function RevenuePanel({ revenue, source, saving, syncing = false, syncError = null, setupHref, onConnectStripe, onSyncRevenue }: Props) {
    const [showDetails, setShowDetails] = useState(false)
    const status = statusCopy(source)
    const summary = revenue?.summary
    const metrics = revenue?.metrics ?? null
    const components = metrics?.components ?? null
    const ratios = metrics?.ratios ?? null
    const ue = metrics?.unitEconomics ?? null
    const engine = summary?.revenueEngine ?? source?.revenueEngine ?? 'subscription'
    const connected = source?.status === 'connected'
    const syncedWithNoRevenue = connected && source?.lastSyncedAt && (summary?.mrrCents ?? 0) === 0

    const growth = ratios?.mrrGrowthRate ?? null
    const growthTone: Tone = growth == null ? 'neutral' : growth > 0 ? 'good' : growth < 0 ? 'bad' : 'ok'
    const growthArrow = growth == null ? '' : growth > 0 ? '▲' : growth < 0 ? '▼' : ''

    return (
        <section className="flex flex-col gap-5 rounded-md bg-(--color-card) p-5">
            {syncError && (
                <p className="rounded-md border border-(--color-error) px-3 py-2 text-sm text-(--color-error)">Sync failed: {syncError}</p>
            )}

            {/* ── Hero: the one number, with direction ── */}
            <div className="flex flex-wrap items-end justify-between gap-4 rounded-md border border-(--color-border) bg-(--color-bg) p-5">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-(--color-text-muted)">Monthly recurring revenue</p>
                    <div className="mt-1 flex items-end gap-3">
                        <span className="text-4xl font-semibold tracking-[-0.02em] text-(--color-text)">{money(summary?.mrrCents)}</span>
                        {growth != null && (
                            <span className={`mb-1 text-sm font-semibold ${toneText(growthTone)}`}>{growthArrow} {percent(Math.abs(growth))}</span>
                        )}
                    </div>
                    {metrics && <p className="mt-1 text-xs text-(--color-text-muted)">over the last {metrics.windowDays} days</p>}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <div className="rounded-full border border-(--color-border) px-3 py-1 text-xs font-medium text-(--color-text-muted)">{status.label}</div>
                    {connected && onSyncRevenue && (
                        <button
                            type="button"
                            onClick={onSyncRevenue}
                            disabled={syncing}
                            className="rounded-md border border-(--color-border) px-4 py-2 text-sm font-medium text-(--color-text) transition-colors hover:bg-(--color-card) disabled:opacity-40"
                        >
                            {syncing ? 'Syncing…' : 'Sync revenue'}
                        </button>
                    )}
                </div>
            </div>

            {/* MRR engine comparison */}
            {(summary?.subscriptionMrrCents != null || summary?.invoiceMrrCents != null) && (
                <p className="text-xs text-(--color-text-muted)">
                    Reading the <span className="font-medium text-(--color-text)">{engine}</span> engine
                    <Info text="Two MRR engines run in parallel: the legacy subscription snapshot and the invoice-derived engine. The flag selects which one is shown." />
                    {' · '}subscription {money(summary?.subscriptionMrrCents)} · invoice {money(summary?.invoiceMrrCents)}
                </p>
            )}

            {/* ── Coaching when connected but no data ── */}
            {!metrics && connected && (
                <div className="rounded-md border border-dashed border-(--color-border) bg-(--color-bg) p-4 text-sm text-(--color-text-muted)">
                    {syncedWithNoRevenue
                        ? 'No active subscription revenue was found on the connected Stripe account yet. Once invoices exist, this fills in automatically.'
                        : 'Sync revenue to compute movement and retention metrics for this product.'}
                </div>
            )}
            {!connected && (
                <div className="rounded-md border border-dashed border-(--color-border) bg-(--color-bg) p-4 text-sm text-(--color-text-muted)">{status.detail}</div>
            )}

            {metrics && components && ratios && (
                <>
                    {/* ── Waterfall ── */}
                    <div className="flex flex-col gap-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">
                            Where MRR moved
                            <Info text="Every change in recurring revenue, split into new, expansion and reactivation (gains) versus contraction and churn (losses)." />
                        </p>
                        <Waterfall
                            starting={components.startingMrrCents}
                            current={components.currentMrrCents}
                            gains={[
                                { label: 'New', value: components.newMrrCents },
                                { label: 'Expansion', value: components.expansionMrrCents },
                                { label: 'Reactivation', value: components.reactivationMrrCents },
                            ]}
                            losses={[
                                { label: 'Contraction', value: components.contractionMrrCents },
                                { label: 'Churn', value: components.churnMrrCents },
                            ]}
                        />
                        <p className="text-xs text-(--color-text-muted)">{components.activeAccounts} active accounts · {components.newCustomers} new · {components.churnedCustomers} churned this window</p>
                    </div>

                    {/* ── Health verdicts: the 3 that matter ── */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <VerdictCard label="Net revenue retention" value={percent(ratios.nrr)} info="Starting MRR + expansion − contraction − churn, ÷ starting. Above 100% means existing customers grow on their own."
                            {...verdict('nrr', ratios.nrr)} />
                        <VerdictCard label="Net MRR churn" value={percent(ratios.netMrrChurn)} info="(churn + contraction − expansion − reactivation) ÷ starting MRR. Negative is best."
                            {...verdict('netChurn', ratios.netMrrChurn)} />
                        <VerdictCard label="Quick ratio" value={multiple(ratios.quickRatio)} info="(new + expansion) ÷ (contraction + churn). Above 4 is efficient growth."
                            {...verdict('quick', ratios.quickRatio)} />
                    </div>

                    {/* ── Progressive disclosure ── */}
                    <button
                        type="button"
                        onClick={() => setShowDetails(v => !v)}
                        className="self-start text-xs font-semibold uppercase tracking-widest text-(--color-text-muted) transition-colors hover:text-(--color-text)"
                    >
                        {showDetails ? '− Hide details' : '+ Show retention & unit economics'}
                    </button>

                    {showDetails && (
                        <div className="flex flex-col gap-5">
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <StatTile label="Gross revenue retention" value={percent(ratios.grr)} hint="kept before expansion" />
                                <StatTile label="Gross MRR churn" value={percent(ratios.grossMrrChurn)} hint={`churn + contraction ÷ ${money(components.startingMrrCents)}`} />
                                <StatTile label="Logo churn" value={percent(ratios.logoChurn)} hint={`${components.churnedCustomers} of ${components.customersAtStart} accounts`} />
                                <StatTile label="ARPA" value={money(ratios.arpaCents)} hint="per active account" />
                            </div>

                            {ue && (
                                <div className="flex flex-col gap-2">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)">
                                        Unit economics
                                        {ue.grossMarginEstimated ? <span className="ml-2 normal-case text-(--color-text-faint)">· using a {percent(ue.grossMarginPct)} default margin{setupHref ? ' — set yours in setup' : ''}</span> : null}
                                    </p>
                                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                        <StatTile label="LTV" value={money(ue.ltvCents)} hint={`capped at ${ue.ltvCapMonths} mo`} estimated={ue.grossMarginEstimated} />
                                        <StatTile label="CAC payback" value={months(ue.cacPaybackMonths)} hint={ue.cacCents != null ? `CAC ${money(ue.cacCents)}` : 'set CAC to compute'} />
                                        <StatTile label="LTV : CAC" value={multiple(ue.ltvCac)} hint="3× or better is healthy" estimated={ue.grossMarginEstimated} />
                                        <StatTile label="Rule of 40" value={ue.ruleOf40 != null ? `${ue.ruleOf40}` : '—'} hint={ue.ruleOf40 != null ? 'growth + profit margin ≥ 40' : 'set profit margin to compute'} estimated={ue.ruleOf40Estimated} />
                                    </div>
                                </div>
                            )}

                            {metrics.warnings?.length > 0 && (
                                <p className="rounded-md border border-(--color-warning) bg-(--color-warning-soft) px-3 py-2 text-xs text-(--color-warning)">{metrics.warnings.join(' · ')}</p>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* ── Stripe connection footer ── */}
            <div className="rounded-md border border-(--color-border) bg-(--color-bg) p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-medium text-(--color-text)">Stripe</p>
                        <p className="mt-1 text-sm text-(--color-text-muted)">
                            {connected
                                ? `Connected account: ${source?.providerAccountLabel ?? source?.providerAccountId ?? 'Stripe'} · Last synced: ${formatDateTime(source?.lastSyncedAt ?? null, 'Not synced yet')}`
                                : 'Authorize Stripe from setup before revenue metrics can sync.'}
                        </p>
                    </div>
                    {!connected && onConnectStripe ? (
                        <button
                            type="button"
                            onClick={onConnectStripe}
                            disabled={saving}
                            className="rounded-md border border-(--color-border) px-4 py-2 text-sm font-medium text-(--color-text) transition-colors hover:bg-(--color-card) disabled:opacity-40"
                        >
                            {saving ? 'Opening Stripe…' : 'Connect Stripe'}
                        </button>
                    ) : !connected && setupHref ? (
                        <Link href={setupHref} className="rounded-md border border-(--color-border) px-4 py-2 text-sm font-medium text-(--color-text) transition-colors hover:bg-(--color-card)">Manage setup</Link>
                    ) : null}
                </div>
            </div>
        </section>
    )
}
