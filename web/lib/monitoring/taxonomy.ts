import type { ChipTone } from '@/app/(core)/dashboard/components/Chip'

// One severity scale for the whole Monitor section. Today "how bad is it" is
// expressed in several disjoint vocabularies — log levels (debug/info/warn/
// error), error/issue levels (error/warning), and problem severities (info/
// warning/critical). `toSeverity` folds them onto a single ordered scale, and
// `severityChipTone` maps that scale onto the shared <Chip> tones, so severity
// badges everywhere render through one centralized path.

export type MonitorSeverity = 'ok' | 'info' | 'warning' | 'critical'

export function toSeverity(value: string | null | undefined): MonitorSeverity {
    switch ((value ?? '').toLowerCase()) {
        case 'critical':
        case 'fatal':
        case 'error':
            return 'critical'
        case 'warning':
        case 'warn':
            return 'warning'
        case 'ok':
        case 'success':
        case 'healthy':
            return 'ok'
        case 'info':
        case 'debug':
        case 'trace':
            return 'info'
        default:
            return 'info'
    }
}

// Severity → the shared Chip tone, so a severity badge reads like every other
// status chip in the design system.
export function severityChipTone(severity: MonitorSeverity): ChipTone {
    switch (severity) {
        case 'critical':
            return 'danger'
        case 'warning':
            return 'warning'
        case 'ok':
            return 'success'
        case 'info':
            return 'info'
    }
}
