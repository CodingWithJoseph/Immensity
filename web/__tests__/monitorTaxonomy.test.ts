import { toSeverity, severityChipTone } from '@/lib/monitoring/taxonomy'

describe('toSeverity', () => {
    it('folds error-ish levels to critical', () => {
        for (const v of ['error', 'critical', 'fatal', 'ERROR']) expect(toSeverity(v)).toBe('critical')
    })
    it('folds both warn and warning to warning', () => {
        expect(toSeverity('warn')).toBe('warning')
        expect(toSeverity('warning')).toBe('warning')
    })
    it('treats info/debug/trace as info', () => {
        for (const v of ['info', 'debug', 'trace']) expect(toSeverity(v)).toBe('info')
    })
    it('recognises healthy/ok/success as ok', () => {
        for (const v of ['ok', 'success', 'healthy']) expect(toSeverity(v)).toBe('ok')
    })
    it('falls back to info for unknown/empty/null', () => {
        expect(toSeverity('whatever')).toBe('info')
        expect(toSeverity('')).toBe('info')
        expect(toSeverity(null)).toBe('info')
        expect(toSeverity(undefined)).toBe('info')
    })
})

describe('severityChipTone', () => {
    it('maps the severity scale onto the shared Chip tones', () => {
        expect(severityChipTone('critical')).toBe('danger')
        expect(severityChipTone('warning')).toBe('warning')
        expect(severityChipTone('info')).toBe('info')
        expect(severityChipTone('ok')).toBe('success')
    })

    it('bridges legacy vocab straight to a Chip tone', () => {
        // How the panels use it: raw level/severity → tone.
        expect(severityChipTone(toSeverity('error'))).toBe('danger')     // Issues / CommandCenter
        expect(severityChipTone(toSeverity('warning'))).toBe('warning')  // Problems
        expect(severityChipTone(toSeverity('critical'))).toBe('danger')  // Problems
    })
})
