'use client'
import { useEffect, useRef } from 'react'

const FOCUSABLE = [
    'a[href]', 'button:not([disabled])', 'textarea:not([disabled])',
    'input:not([disabled])', 'select:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',')

// Focus management for a modal dialog. Pair it with role="dialog" + aria-modal on
// the same node (give that node tabIndex={-1} so it can hold focus as a fallback).
//
// On open it moves focus into the dialog — unless something inside already claimed
// it (e.g. an autoFocus input) — traps Tab so focus can't wander behind the
// backdrop, and on close restores focus to whatever was focused before. Escape
// stays with the caller; each modal already wires its own.
export function useDialogFocus<T extends HTMLElement = HTMLElement>() {
    const ref = useRef<T>(null)
    useEffect(() => {
        const node = ref.current
        if (!node) return
        const previouslyFocused = document.activeElement as HTMLElement | null
        const focusables = () => Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE))
            .filter(el => !el.hasAttribute('hidden') && el.getAttribute('aria-hidden') !== 'true')

        if (!node.contains(document.activeElement)) {
            (focusables()[0] ?? node).focus()
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Tab') return
            const items = focusables()
            if (items.length === 0) { event.preventDefault(); return }
            const first = items[0]
            const last = items[items.length - 1]
            const active = document.activeElement
            if (event.shiftKey && (active === first || active === node)) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && active === last) {
                event.preventDefault()
                first.focus()
            }
        }

        node.addEventListener('keydown', onKeyDown)
        return () => {
            node.removeEventListener('keydown', onKeyDown)
            previouslyFocused?.focus?.()
        }
    }, [])
    return ref
}
