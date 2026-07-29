import React, {useState} from 'react'

export default function CollapsibleSection({title, locked, lockTooltip, defaultOpen, children,}: {
    title: string
    locked: boolean
    lockTooltip: string
    defaultOpen: boolean
    children: React.ReactNode })
{
    const [open, setOpen] = useState(defaultOpen)

    return (
        <div className="flex flex-col gap-1">
            <button
                onClick={() => setOpen(prev => !prev)}
                className="flex items-center justify-between px-3 py-2 w-full hover:bg-(--color-border) rounded-lg transition-colors group/header">
                <p className="text-xs font-medium text-(--color-text)">{title}</p>
                <div className="flex items-center gap-1">
                    {locked && (
                        <div className="relative group/lock">
                            <span className="text-xs">🔒</span>
                            <div className="absolute right-0 top-full mt-1 w-48 bg-(--color-text) text-(--color-bg) text-xs rounded-lg px-3 py-2 hidden group-hover/lock:block z-50 pointer-events-none">
                                {lockTooltip}
                            </div>
                        </div>
                    )}
                    <svg
                        width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2"
                        className={`text-(--color-text-muted) transition-transform ${open ? 'rotate-180' : ''}`}>
                        <path d="M6 9l6 6 6-6"/>
                    </svg>
                </div>
            </button>
            {open && (
                <div className="flex flex-col gap-1">
                    {children}
                </div>
            )}
        </div>
    )
}