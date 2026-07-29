'use client'

import {
    Archive,
    Bookmark,
    History,
    LoaderCircle,
    Pencil,
    RotateCcw,
    Search,
    Trash2,
    X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDialogFocus } from '@/app/(core)/dashboard/hooks/useDialogFocus'
import type { SearchSessionSummary, SearchSessionView } from '@/lib/types/search'

const VIEWS: { value: SearchSessionView; label: string }[] = [
    { value: 'recent', label: 'Recent' },
    { value: 'saved', label: 'Saved' },
    { value: 'archived', label: 'Archived' },
]

function formatActivity(value: string): string {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Recently used'
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getUTCFullYear() === new Date().getUTCFullYear() ? undefined : 'numeric',
        timeZone: 'UTC',
    }).format(date)
}

export default function SearchHistoryPanel({
    open,
    view,
    sessions,
    activeSessionId,
    loading,
    error,
    pendingSessionId,
    onClose,
    onViewChange,
    onOpenSession,
    onNewSearch,
    onUpdateSession,
    onDeleteSession,
}: {
    open: boolean
    view: SearchSessionView
    sessions: SearchSessionSummary[]
    activeSessionId: string | null
    loading: boolean
    error: string | null
    pendingSessionId: string | null
    onClose: () => void
    onViewChange: (view: SearchSessionView) => void
    onOpenSession: (id: string) => void
    onNewSearch: () => void
    onUpdateSession: (id: string, update: { title?: string; saved?: boolean; archived?: boolean }) => void
    onDeleteSession: (id: string) => void
}) {
    const dialogRef = useDialogFocus<HTMLElement>()
    const [editingId, setEditingId] = useState<string | null>(null)
    const [title, setTitle] = useState('')
    const actionsPending = pendingSessionId !== null

    useEffect(() => {
        if (!open) return
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [onClose, open])

    if (!open) return null

    const beginRename = (session: SearchSessionSummary) => {
        setEditingId(session.id)
        setTitle(session.title)
    }

    const finishRename = (session: SearchSessionSummary) => {
        const nextTitle = title.trim()
        if (nextTitle && nextTitle !== session.title) {
            onUpdateSession(session.id, { title: nextTitle })
        }
        setEditingId(null)
    }

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/35" onClick={onClose}>
            <aside
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label="Search history"
                tabIndex={-1}
                onClick={event => event.stopPropagation()}
                className="flex h-full w-full max-w-md flex-col border-l border-(--color-border) bg-(--color-surface) shadow-2xl outline-none"
            >
                <div className="flex items-center justify-between border-b border-(--color-border) px-5 py-4">
                    <div className="flex items-center gap-2">
                        <History size={18} aria-hidden />
                        <h2 className="font-semibold text-(--color-text)">Search history</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close search history"
                        className="rounded-lg p-2 text-(--color-text-muted) hover:bg-(--color-surface-tint) hover:text-(--color-text)"
                    >
                        <X size={18} aria-hidden />
                    </button>
                </div>

                <div className="px-5 pt-4">
                    <button
                        type="button"
                        onClick={onNewSearch}
                        disabled={actionsPending}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-(--color-button) px-4 py-2.5 text-sm font-semibold text-(--color-on-button) hover:bg-(--color-button-hover) disabled:cursor-wait disabled:opacity-50"
                    >
                        <Search size={16} aria-hidden />
                        New search
                    </button>
                    <div className="mt-4 grid grid-cols-3 rounded-xl bg-(--color-surface-tint) p-1" role="tablist" aria-label="History type">
                        {VIEWS.map(item => (
                            <button
                                key={item.value}
                                type="button"
                                role="tab"
                                aria-selected={view === item.value}
                                onClick={() => onViewChange(item.value)}
                                disabled={actionsPending}
                                className={`rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
                                    view === item.value
                                        ? 'bg-(--color-surface) text-(--color-text) shadow-sm'
                                        : 'text-(--color-text-muted) hover:text-(--color-text)'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    {loading && (
                        <div className="flex items-center justify-center gap-2 py-12 text-sm text-(--color-text-muted)">
                            <LoaderCircle size={17} className="animate-spin" aria-hidden />
                            Loading history…
                        </div>
                    )}
                    {!loading && error && (
                        <p className="rounded-xl bg-(--color-error-soft) px-4 py-3 text-sm text-(--color-error-text)" role="alert">
                            {error}
                        </p>
                    )}
                    {!loading && !error && sessions.length === 0 && (
                        <div className="py-12 text-center">
                            <p className="text-sm font-medium text-(--color-text)">No {view} searches yet.</p>
                            <p className="mt-1 text-xs leading-5 text-(--color-text-muted)">
                                Unsaved searches stay here for 30 days. Saved searches stay until you archive or delete them.
                            </p>
                        </div>
                    )}
                    {!loading && !error && sessions.length > 0 && (
                        <ul className="space-y-2">
                            {sessions.map(session => {
                                const pending = pendingSessionId === session.id
                                const active = activeSessionId === session.id
                                return (
                                    <li
                                        key={session.id}
                                        className={`rounded-xl border p-3 ${
                                            active
                                                ? 'border-(--color-accent) bg-(--color-accent-soft)'
                                                : 'border-(--color-border) bg-(--color-bg)'
                                        }`}
                                    >
                                        {editingId === session.id ? (
                                            <form
                                                onSubmit={event => {
                                                    event.preventDefault()
                                                    finishRename(session)
                                                }}
                                                className="flex gap-2"
                                            >
                                                <input
                                                    autoFocus
                                                    value={title}
                                                    maxLength={160}
                                                    onChange={event => setTitle(event.target.value)}
                                                    aria-label="Search title"
                                                    className="min-w-0 flex-1 rounded-lg border border-(--color-border-strong) bg-(--color-surface) px-3 py-2 text-sm text-(--color-text)"
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={!title.trim() || actionsPending}
                                                    className="rounded-lg bg-(--color-button) px-3 text-xs font-semibold text-(--color-on-button) hover:bg-(--color-button-hover) disabled:opacity-40"
                                                >
                                                    Save
                                                </button>
                                            </form>
                                        ) : (
                                            <button
                                                type="button"
                                                disabled={actionsPending}
                                                onClick={() => onOpenSession(session.id)}
                                                className="block w-full rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus) disabled:opacity-50"
                                            >
                                                <span className="block truncate text-sm font-medium text-(--color-text)">{session.title}</span>
                                                <span className="mt-1 block text-xs text-(--color-text-muted)">
                                                    {pending ? 'Opening…' : `Used ${formatActivity(session.last_activity_at)}`}
                                                </span>
                                            </button>
                                        )}

                                        <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-(--color-border) pt-2">
                                            <button
                                                type="button"
                                                onClick={() => beginRename(session)}
                                                disabled={actionsPending}
                                                aria-label={`Rename ${session.title}`}
                                                title="Rename"
                                                className="rounded-lg p-2 text-(--color-text-muted) hover:bg-(--color-surface) hover:text-(--color-text)"
                                            >
                                                <Pencil size={14} aria-hidden />
                                            </button>
                                            {!session.saved && !session.archived && (
                                                <button
                                                    type="button"
                                                    onClick={() => onUpdateSession(session.id, { saved: true })}
                                                    disabled={actionsPending}
                                                    aria-label={`Save ${session.title}`}
                                                    title="Save"
                                                    className="rounded-lg p-2 text-(--color-text-muted) hover:bg-(--color-surface) hover:text-(--color-text)"
                                                >
                                                    <Bookmark size={14} aria-hidden />
                                                </button>
                                            )}
                                            {!session.archived ? (
                                                <button
                                                    type="button"
                                                    onClick={() => onUpdateSession(session.id, { archived: true })}
                                                    disabled={actionsPending}
                                                    aria-label={`Archive ${session.title}`}
                                                    title="Archive"
                                                    className="rounded-lg p-2 text-(--color-text-muted) hover:bg-(--color-surface) hover:text-(--color-text)"
                                                >
                                                    <Archive size={14} aria-hidden />
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => onUpdateSession(session.id, { archived: false })}
                                                    disabled={actionsPending}
                                                    aria-label={`Restore ${session.title}`}
                                                    title="Restore"
                                                    className="rounded-lg p-2 text-(--color-text-muted) hover:bg-(--color-surface) hover:text-(--color-text)"
                                                >
                                                    <RotateCcw size={14} aria-hidden />
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => onDeleteSession(session.id)}
                                                disabled={actionsPending}
                                                aria-label={`Delete ${session.title}`}
                                                title="Delete"
                                                className="ml-auto rounded-lg p-2 text-(--color-text-muted) hover:bg-(--color-error-soft) hover:text-(--color-error-text)"
                                            >
                                                <Trash2 size={14} aria-hidden />
                                            </button>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            </aside>
        </div>
    )
}
