'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import type { PortfolioProduct, UsageSource } from '../types'
import { customEventsSnippet, usageAssistantPrompt, usagePackageSnippet, usageReactSnippet, usageScriptSnippet } from '../usageInstall'

type InstallMethod = 'assistant' | 'script' | 'react' | 'package' | 'events'

interface Props {
    product: PortfolioProduct
    source: UsageSource | null
    origin: string
    saving: boolean
    savingSetup: boolean
    onEnable: () => void
    onSaveSetup: (values: { productUrl: string; allowedDomain: string }) => Promise<void>
}

function hostFromUrl(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return ''
    try {
        const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`)
        return url.hostname.replace(/^www\./, '')
    } catch {
        return trimmed.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '')
    }
}

function statusFor(source: UsageSource | null) {
    if (!source) {
        return {
            label: 'Not connected',
            detail: 'Enable the usage monitor to generate install options.',
            className: 'border-(--color-border) text-(--color-text-muted)',
        }
    }
    if (!source.lastSeenAt) {
        return {
            label: 'Waiting for first event',
            detail: 'Install one option below, then open the launched product once.',
            className: 'border-(--color-border) text-(--color-text-muted)',
        }
    }
    const lastSeen = new Date(source.lastSeenAt).getTime()
    const stale = !Number.isNaN(lastSeen) && Date.now() - lastSeen > 7 * 24 * 60 * 60 * 1000
    return stale ? {
        label: 'No recent events',
        detail: 'The setup worked before, but no event has arrived recently.',
        className: 'border-(--color-border) text-(--color-text-muted)',
    } : {
        label: 'Connected',
        detail: 'Events are arriving from this launched product.',
        className: 'border-(--color-text) text-(--color-text)',
    }
}

function CodeBlock({ code, label }: { code: string; label: string }) {
    const [copied, setCopied] = useState(false)

    async function copyCode() {
        await navigator.clipboard?.writeText(code)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1600)
    }

    return (
        <div className="rounded-md border border-(--color-border) bg-(--color-bg)">
            <div className="flex items-center justify-between gap-3 border-b border-(--color-border) px-3 py-2">
                <span className="text-xs font-medium text-(--color-text-muted)">{label}</span>
                <button
                    type="button"
                    onClick={() => void copyCode()}
                    className="rounded-md border border-(--color-border) px-2.5 py-1 text-xs text-(--color-text-muted) hover:text-(--color-text)"
                >
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
            <pre className="max-h-64 overflow-auto p-3 text-xs leading-5 text-(--color-text)">{code}</pre>
        </div>
    )
}

export default function UsageSetupPanel({ product, source, origin, saving, savingSetup, onEnable, onSaveSetup }: Props) {
    const [productUrl, setProductUrl] = useState('')
    const [allowedDomain, setAllowedDomain] = useState('')
    const [method, setMethod] = useState<InstallMethod>('assistant')
    const [showCode, setShowCode] = useState(true)

    useEffect(() => {
        const url = source?.productUrl ?? product.url ?? ''
        setProductUrl(url)
        setAllowedDomain(source?.allowedDomain ?? hostFromUrl(url))
    }, [product.url, source])

    const status = statusFor(source)
    const installCode = useMemo(() => {
        if (!source || !origin) return ''
        if (method === 'assistant') return usageAssistantPrompt(origin, product, source)
        if (method === 'react') return usageReactSnippet(origin, product, source)
        if (method === 'package') return usagePackageSnippet(product, source)
        if (method === 'events') return customEventsSnippet()
        return usageScriptSnippet(origin, product, source)
    }, [method, origin, product, source])

    async function submitSetup(event: FormEvent) {
        event.preventDefault()
        await onSaveSetup({ productUrl, allowedDomain })
    }

    return (
        <section className="rounded-md bg-(--color-card) p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-(--color-text)">Usage setup</p>
                    <p className="mt-1 text-sm text-(--color-text-muted)">Connect this launched product and verify events from its domain.</p>
                </div>
                <div className={`rounded-full border px-3 py-1 text-xs font-medium ${status.className}`}>
                    {status.label}
                </div>
            </div>
            <p className="mt-3 text-sm text-(--color-text-muted)">{status.detail}</p>

            {!source ? (
                <button
                    type="button"
                    onClick={onEnable}
                    disabled={saving}
                    className="mt-5 rounded-md bg-(--color-button) px-4 py-2 text-sm font-medium text-(--color-on-button) transition-colors hover:bg-(--color-button-hover) disabled:opacity-40"
                >
                    {saving ? 'Enabling...' : 'Enable usage monitor'}
                </button>
            ) : (
                <div className="mt-5 flex flex-col gap-5">
                    <form onSubmit={event => void submitSetup(event)} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,320px)_auto]">
                        <label className="flex flex-col gap-1 text-xs font-medium text-(--color-text-muted)">
                            Product URL
                            <input
                                value={productUrl}
                                onChange={event => {
                                    setProductUrl(event.target.value)
                                    if (!allowedDomain) setAllowedDomain(hostFromUrl(event.target.value))
                                }}
                                placeholder="https://your-product.com"
                                className="rounded-md border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm font-normal text-(--color-text) outline-none focus:ring-2 focus:ring-(--color-text)"
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-xs font-medium text-(--color-text-muted)">
                            Allowed domain
                            <input
                                value={allowedDomain}
                                onChange={event => setAllowedDomain(event.target.value)}
                                placeholder="your-product.com"
                                className="rounded-md border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm font-normal text-(--color-text) outline-none focus:ring-2 focus:ring-(--color-text)"
                            />
                        </label>
                        <button
                            type="submit"
                            disabled={savingSetup}
                            className="self-end rounded-md border border-(--color-border) px-4 py-2 text-sm font-medium text-(--color-text) transition-colors hover:bg-(--color-bg) disabled:opacity-40"
                        >
                            {savingSetup ? 'Saving...' : 'Save setup'}
                        </button>
                    </form>

                    <div>
                        <div className="flex flex-wrap gap-2">
                            {([
                                ['assistant', 'MCP / assistant'],
                                ['script', 'Script snippet'],
                                ['react', 'React / Next.js'],
                                ['package', 'Package option'],
                                ['events', 'Custom events'],
                            ] as [InstallMethod, string][]).map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => {
                                        setMethod(key)
                                        setShowCode(true)
                                    }}
                                    className={`rounded-md border px-3 py-2 text-sm ${method === key ? 'border-(--color-text) text-(--color-text)' : 'border-(--color-border) text-(--color-text-muted) hover:text-(--color-text)'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowCode(value => !value)}
                            className="mt-3 text-sm font-medium text-(--color-text) hover:underline"
                        >
                            {showCode ? 'Hide install code' : 'Show install code'}
                        </button>
                        {showCode && installCode && (
                            <div className="mt-3">
                                <CodeBlock code={installCode} label={method === 'assistant' ? 'MCP / assistant setup prompt' : method === 'package' ? 'Package install option' : 'Install code'} />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    )
}
