'use client'
import React, { useState } from 'react'

type Props = {
    value: string
    onChangeAction: React.ChangeEventHandler<HTMLInputElement>
    disabled: boolean
    placeholder?: string
    label?: string
}

export default function PasswordInput({ value, onChangeAction, disabled, placeholder = 'Password', label }: Props) {
    const [show, setShow] = useState(false)
    return (
        <div className="flex flex-col gap-1.5">
            {label && <label className="text-xs font-medium text-(--color-text)">{label}</label>}
            <div className="relative">
                <input
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={onChangeAction}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="w-full border border-(--color-border) bg-(--color-surface) text-(--color-text) rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-(--color-text) disabled:opacity-50 disabled:cursor-not-allowed"/>
                <button
                    type="button"
                    onClick={() => setShow(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-(--color-text-muted) hover:text-(--color-text) transition-colors">
                    {show ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    )}
                </button>
            </div>
        </div>
    )
}