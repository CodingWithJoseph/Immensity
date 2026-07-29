'use client'

import { Database, LayoutList, MessageSquareText } from 'lucide-react'
import type { SignalWorkspaceView } from './types'

const VIEWS: {
    id: SignalWorkspaceView
    label: string
    icon: typeof LayoutList
}[] = [
    { id: 'overview', label: 'Overview', icon: LayoutList },
    { id: 'evidence', label: 'Evidence', icon: Database },
    { id: 'conversation', label: 'Ask Signal', icon: MessageSquareText },
]

export default function SignalWorkspaceTabs({
    value,
    onChange,
}: {
    value: SignalWorkspaceView
    onChange: (view: SignalWorkspaceView) => void
}) {
    return (
        <div
            role="tablist"
            aria-label="Signal workspace view"
            className="flex items-center gap-1"
        >
            {VIEWS.map(view => {
                const Icon = view.icon
                const selected = view.id === value
                return (
                    <button
                        key={view.id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        aria-controls={`signal-${view.id}-panel`}
                        onClick={() => onChange(view.id)}
                        className={`inline-flex min-h-9 items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                            selected
                                ? 'bg-(--color-surface) text-(--color-text) shadow-sm'
                                : 'text-(--color-text-muted) hover:bg-(--color-surface) hover:text-(--color-text)'
                        }`}
                    >
                        <Icon size={15} aria-hidden />
                        {view.label}
                    </button>
                )
            })}
        </div>
    )
}
