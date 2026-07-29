import type { ChipAppearance, ChipTone } from '@/app/(core)/dashboard/components/Chip'

type ThemeColor = {
    token: string
    light: `#${string}`
    dark: `#${string}`
}

export type ChipColorSet = {
    family: 'gray/taupe' | 'blue' | 'green' | 'amber' | 'red'
    background: ThemeColor
    semantic: ThemeColor
    text: ThemeColor
    border: 'none'
}

export type ChipSetDefinition = {
    label: string
    tone: ChipTone
    appearance: Extract<ChipAppearance, 'filled'>
    fontWeight: 'bold'
    colors: ChipColorSet
}

export const CHIP_TONE_COLORS = {
    neutral: {
        family: 'gray/taupe',
        background: { token: '--chip-neutral-bg', light: '#E2D8CC', dark: '#2D2A27' },
        semantic: { token: '--chip-neutral-bg', light: '#E2D8CC', dark: '#2D2A27' },
        text: { token: '--chip-neutral-text', light: '#3A342E', dark: '#C8BFB4' },
        border: 'none',
    },
    muted: {
        family: 'gray/taupe',
        background: { token: '--chip-neutral-bg', light: '#E2D8CC', dark: '#2D2A27' },
        semantic: { token: '--chip-neutral-bg', light: '#E2D8CC', dark: '#2D2A27' },
        text: { token: '--chip-neutral-text', light: '#3A342E', dark: '#C8BFB4' },
        border: 'none',
    },
    info: {
        family: 'blue',
        background: { token: '--chip-info-bg', light: '#C8DEF8', dark: '#102A46' },
        semantic: { token: '--chip-info-bg', light: '#C8DEF8', dark: '#102A46' },
        text: { token: '--chip-info-text', light: '#0B437A', dark: '#8AC0FF' },
        border: 'none',
    },
    success: {
        family: 'green',
        background: { token: '--chip-success-bg', light: '#B2E8CC', dark: '#123425' },
        semantic: { token: '--chip-success-bg', light: '#B2E8CC', dark: '#123425' },
        text: { token: '--chip-success-text', light: '#0D5535', dark: '#8DFFD0' },
        border: 'none',
    },
    warning: {
        family: 'amber',
        background: { token: '--chip-warning-bg', light: '#EBC969', dark: '#3A2D0A' },
        semantic: { token: '--chip-warning-bg', light: '#EBC969', dark: '#3A2D0A' },
        text: { token: '--chip-warning-text', light: '#664100', dark: '#FFD666' },
        border: 'none',
    },
    danger: {
        family: 'red',
        background: { token: '--chip-danger-bg', light: '#F5B9B2', dark: '#3A1717' },
        semantic: { token: '--chip-danger-bg', light: '#F5B9B2', dark: '#3A1717' },
        text: { token: '--chip-danger-text', light: '#7D211A', dark: '#FF8A8A' },
        border: 'none',
    },
} as const satisfies Record<ChipTone, ChipColorSet>

function chip(label: string, tone: ChipTone): ChipSetDefinition {
    return {
        label,
        tone,
        appearance: 'filled',
        fontWeight: 'bold',
        colors: CHIP_TONE_COLORS[tone],
    }
}

export const PROJECT_STATUS_CHIPS = {
    watching: chip('Watching', 'info'),
    building: chip('Building', 'info'),
    launched: chip('Launched', 'success'),
    live: chip('Live', 'success'),
    'needs-setup': chip('Needs setup', 'warning'),
    paused: chip('Paused', 'warning'),
    sunsetting: chip('Sunsetting', 'warning'),
    killed: chip('Killed', 'danger'),
    archived: chip('Archived', 'muted'),
    retired: chip('Retired', 'muted'),
    removed: chip('Removed', 'muted'),
    blocked: chip('Blocked', 'danger'),
    'on-track': chip('On track', 'info'),
    'needs-attention': chip('Needs attention', 'warning'),
    'at-risk': chip('At risk', 'danger'),
} as const satisfies Record<string, ChipSetDefinition>

export type ProjectStatusChip = keyof typeof PROJECT_STATUS_CHIPS

export const PROJECT_HEALTH_CHIPS = {
    healthy: chip('Healthy', 'success'),
    warning: chip('Warning', 'warning'),
    unhealthy: chip('Unhealthy', 'danger'),
    'needs-attention': chip('Needs attention', 'warning'),
    'at-risk': chip('At risk', 'danger'),
    'no-data': chip('No data', 'warning'),
    stale: chip('Stale', 'warning'),
    critical: chip('Critical', 'danger'),
    paused: chip('Paused', 'muted'),
    archived: chip('Archived', 'muted'),
} as const satisfies Record<string, ChipSetDefinition>

export type ProjectHealthChip = keyof typeof PROJECT_HEALTH_CHIPS

export const ISSUE_CHIPS = {
    issuesClear: chip('issues', 'neutral'),
    issuesOpen: chip('issues', 'warning'),
    issuesCritical: chip('issues', 'danger'),
    killCriteriaMissing: chip('kill criteria', 'warning'),
    killCriteriaConfigured: chip('kill criteria', 'neutral'),
    killCriteriaTriggered: chip('kill criteria', 'danger'),
    open: chip('Open', 'warning'),
    issue: chip('Issue', 'neutral'),
    killCriterion: chip('Kill criterion', 'neutral'),
} as const satisfies Record<string, ChipSetDefinition>

export type IssueChip = keyof typeof ISSUE_CHIPS

export function issueCountChip(count: number): ChipSetDefinition {
    return count > 0 ? ISSUE_CHIPS.issuesOpen : ISSUE_CHIPS.issuesClear
}

export function killCriteriaCountChip(count: number): ChipSetDefinition {
    return count === 0 ? ISSUE_CHIPS.killCriteriaMissing : ISSUE_CHIPS.killCriteriaConfigured
}

export const PIPELINE_METADATA_CHIPS = {
    stale: chip('Stale', 'muted'),
} as const satisfies Record<string, ChipSetDefinition>

