'use client'

import { useState } from 'react'

interface Props {
    cardId: string
    initialValue: string | null
}

export default function KillCriteriaField({ cardId, initialValue }: Props) {
    const [value, setValue] = useState(initialValue ?? '')
    const [editing, setEditing] = useState(false)

    const handleBlur = async () => {
        setEditing(false)
        await fetch(`/api/pipeline/${cardId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ killCriteria: value }),
        })
    }

    if (!editing) {
        return (
            <button onClick={() => setEditing(true)} className="w-full border-b border-(--color-border) px-1 py-2 text-left">
                {value ? (
                    <p className="text-xs italic leading-relaxed text-(--color-text-muted)">{value}</p>
                ) : (
                    <p className="text-xs text-(--color-text-muted) opacity-50 transition-opacity hover:opacity-100">Set kill criteria...</p>
                )}
            </button>
        )
    }

    return (
        <textarea
            autoFocus
            value={value}
            onChange={event => setValue(event.target.value)}
            onBlur={handleBlur}
            placeholder="I'll stop if..."
            rows={2}
            className="w-full resize-none border-0 border-b border-(--color-border) bg-transparent px-1 py-2 text-xs text-(--color-text) outline-none focus:border-(--color-focus)"
        />
    )
}
