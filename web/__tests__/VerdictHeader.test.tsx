import { render, screen } from '@testing-library/react'
import VerdictHeader from '@/app/(core)/dashboard/(monitor)/monitor/components/VerdictHeader'
import { experienceVerdict } from '@/app/(core)/dashboard/(monitor)/monitor/components/ExperiencePanel'
import { usageVerdict } from '@/app/(core)/dashboard/(monitor)/monitor/components/UsageOverview'
import type { UsageMetrics, VitalMetricSummary } from '@/app/(core)/dashboard/(monitor)/monitor/types'

function lcp(p75: number | null, rating: 'good' | 'needs-improvement' | 'poor' | null): VitalMetricSummary {
    return { metric: 'LCP', sampleCount: 1000, p75, rating, good: 0, needsImprovement: 0, poor: 0 }
}

function usage(signupChange: number | null): UsageMetrics {
    return {
        source: null, connected: true, totalEvents: 1000, lastSeenAt: null, windowDays: 14, growthWindowDays: 7,
        summary14d: { pageviews: 18000, visitors: 6120, signups: 268, logins: 0, activations: 142, customEvents: 0, activeUsers: 2180 },
        topPages: [], topEvents: [],
        growth: { visitors: { current: 3180, previous: 2960, changePct: 0.07 }, signups: { current: 118, previous: 144, changePct: signupChange } },
        daily: [], recentEvents: [],
    } as UsageMetrics
}

describe('experienceVerdict', () => {
    it('calls out slow pages when LCP is poor', () => {
        const v = experienceVerdict([lcp(3640, 'poor')])
        expect(v.tone).toBe('bad')
        expect(v.verdict).toMatch(/feel slow/)
        expect(v.hero?.value).toBe('3.6s')
    })
    it('is positive when LCP is good', () => {
        expect(experienceVerdict([lcp(2100, 'good')]).tone).toBe('good')
    })
    it('is muted with no data', () => {
        const v = experienceVerdict([])
        expect(v.tone).toBe('muted')
        expect(v.hero).toBeUndefined()
    })
})

describe('usageVerdict', () => {
    it('flags a signup slide', () => {
        const v = usageVerdict(usage(-0.18))
        expect(v.tone).toBe('neutral')
        expect(v.verdict).toMatch(/Signups slipped 18%/)
    })
    it('celebrates growth', () => {
        expect(usageVerdict(usage(0.2)).tone).toBe('good')
    })
})

describe('VerdictHeader', () => {
    it('renders the eyebrow, verdict and hero', () => {
        render(<VerdictHeader eyebrow="Experience" verdict="Pages feel slow." tone="bad" hero={{ value: '3.6s', label: 'LCP p75', sub: 'poor' }} />)
        expect(screen.getByText('Experience')).toBeInTheDocument()
        expect(screen.getByText('Pages feel slow.')).toBeInTheDocument()
        expect(screen.getByText('3.6s')).toBeInTheDocument()
        expect(screen.getByText('LCP p75')).toBeInTheDocument()
    })
})
