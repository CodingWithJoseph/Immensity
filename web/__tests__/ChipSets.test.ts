import {
    CHIP_TONE_COLORS,
    ISSUE_CHIPS,
    PROJECT_HEALTH_CHIPS,
    PROJECT_STATUS_CHIPS,
    issueCountChip,
    killCriteriaCountChip,
} from '@/app/(core)/dashboard/components/chipSets'

describe('project chip sets', () => {
    it('maps project lifecycle states to the approved semantic tones', () => {
        expect(PROJECT_STATUS_CHIPS.watching.tone).toBe('info')
        expect(PROJECT_STATUS_CHIPS.building.tone).toBe('info')
        expect(PROJECT_STATUS_CHIPS.live.tone).toBe('success')
        expect(PROJECT_STATUS_CHIPS['needs-setup'].tone).toBe('warning')
        expect(PROJECT_STATUS_CHIPS.paused.tone).toBe('warning')
        expect(PROJECT_STATUS_CHIPS.archived.tone).toBe('muted')
        expect(PROJECT_STATUS_CHIPS.blocked.tone).toBe('danger')
    })

    it('keeps project health separate from lifecycle status', () => {
        expect(PROJECT_HEALTH_CHIPS.healthy.tone).toBe('success')
        expect(PROJECT_HEALTH_CHIPS['needs-attention'].tone).toBe('warning')
        expect(PROJECT_HEALTH_CHIPS['at-risk'].tone).toBe('danger')
        expect(PROJECT_HEALTH_CHIPS.paused.tone).toBe('muted')
        expect(PROJECT_HEALTH_CHIPS.archived.tone).toBe('muted')
    })

    it('centralizes issue and kill-criteria definitions and count rules', () => {
        expect(ISSUE_CHIPS.issuesOpen.tone).toBe('warning')
        expect(ISSUE_CHIPS.issuesCritical.tone).toBe('danger')
        expect(ISSUE_CHIPS.killCriteriaMissing.tone).toBe('warning')
        expect(ISSUE_CHIPS.killCriteriaConfigured.tone).toBe('neutral')
        expect(ISSUE_CHIPS.killCriteriaTriggered.tone).toBe('danger')
        expect(issueCountChip(0)).toBe(ISSUE_CHIPS.issuesClear)
        expect(issueCountChip(2)).toBe(ISSUE_CHIPS.issuesOpen)
        expect(killCriteriaCountChip(0)).toBe(ISSUE_CHIPS.killCriteriaMissing)
        expect(killCriteriaCountChip(2)).toBe(ISSUE_CHIPS.killCriteriaConfigured)
    })

    it('uses token-backed fills and darker tone-specific text colors', () => {
        expect(CHIP_TONE_COLORS.info.background).toEqual({
            token: '--chip-info-bg',
            light: '#C8DEF8',
            dark: '#102A46',
        })
        expect(CHIP_TONE_COLORS.success.background).toEqual({ token: '--chip-success-bg', light: '#B2E8CC', dark: '#123425' })
        expect(CHIP_TONE_COLORS.warning.background).toEqual({ token: '--chip-warning-bg', light: '#EBC969', dark: '#3A2D0A' })
        expect(CHIP_TONE_COLORS.danger.background).toEqual({ token: '--chip-danger-bg', light: '#F5B9B2', dark: '#3A1717' })

        expect(CHIP_TONE_COLORS.info.text).toEqual({ token: '--chip-info-text', light: '#0B437A', dark: '#8AC0FF' })
        expect(CHIP_TONE_COLORS.success.text).toEqual({ token: '--chip-success-text', light: '#0D5535', dark: '#8DFFD0' })
        expect(CHIP_TONE_COLORS.warning.text).toEqual({ token: '--chip-warning-text', light: '#664100', dark: '#FFD666' })
        expect(CHIP_TONE_COLORS.danger.text).toEqual({ token: '--chip-danger-text', light: '#7D211A', dark: '#FF8A8A' })

        expect(PROJECT_STATUS_CHIPS.building.fontWeight).toBe('bold')

        for (const colors of Object.values(CHIP_TONE_COLORS)) {
            expect(colors.border).toBe('none')
        }
    })
})
