'use client'
import {useEffect, useState} from 'react'
import {useRouter} from 'next/navigation'
import {useAuth} from '@/lib/auth-context'
import {routes} from '@/app/util/routes'
import {landingRoute} from '@/lib/landing'
import {PipelineCard} from '@/lib/types/cluster'
import {DashboardActivity, DashboardMovers} from '@/lib/types/dashboard'
import {PipelineProgressListCard} from '@/app/(core)/dashboard/components/columns/PipelineActivityColumn'
import DiscoveryActivityCard, {DiscoveryMetricsCard} from '@/app/(core)/dashboard/components/DiscoveryActivityCard'
import MomentumMoversCard from '@/app/(core)/dashboard/components/MomentumMoversCard'
import { AccountGoalsCard } from '@/app/(core)/dashboard/components/GoalsCards'
import DashboardCalendarCard from '@/app/(core)/dashboard/components/DashboardCalendarCard'
import {
    DashboardActivationRateCard,
    DashboardActiveUsersCard,
    DashboardProductHealthCard,
    DashboardRevenueCard,
    loadDashboardMonitorSummary,
    type DashboardMonitorSummary,
} from '@/app/(core)/dashboard/components/DashboardMonitorCards'
import {fetchJson} from '@/lib/fetchJson'
import {featureProfile} from '@/lib/features'
import {ErrorBoundary} from '@/components/ErrorBoundary'

const dashboardRowClass = 'grid grid-cols-1 gap-4 lg:h-full lg:min-h-0'
const dashboardModuleClass = 'h-[var(--dash-row-h)] min-h-0 overflow-hidden lg:h-full'

export function mergeWorkspaceCards(active: PipelineCard[], launched: PipelineCard[]): PipelineCard[] {
    const cards = new Map<string, PipelineCard>()
    for (const card of [...active, ...launched]) {
        if (!card.removedAt) cards.set(card.id, card)
    }
    return [...cards.values()]
}

export default function DashboardPage() {
    const { user, authReady } = useAuth()
    const [movers, setMovers] = useState<DashboardMovers | null>(null)
    const [activity, setActivity] = useState<DashboardActivity | null>(null)
    const [pipelineCards, setPipelineCards] = useState<PipelineCard[] | null>(null)
    const [workspaceCards, setWorkspaceCards] = useState<PipelineCard[] | null>(null)
    const [monitorSummary, setMonitorSummary] = useState<DashboardMonitorSummary | null>(null)
    const [monitorLoading, setMonitorLoading] = useState(featureProfile === 'full')
    const [dataLoading, setDataLoading] = useState(false)
    const loading = !authReady || dataLoading
    const router = useRouter()


    useEffect(() => {
        if (!authReady || !user) return
        if (sessionStorage.getItem('pf-landing-applied')) return
        sessionStorage.setItem('pf-landing-applied', '1')
        let active = true
        void (async () => {
            try {
                const json = await fetchJson<{ data: { defaultLanding: string | null } }>('/api/account/preferences')
                if (!active) return
                const route = landingRoute(json?.data?.defaultLanding)
                if (route && route !== routes.core.dashboard) router.replace(route)
            } catch {
                // No preference applied — stay on the dashboard.
            }
        })()
        return () => { active = false }
    }, [authReady, user, router])

    useEffect(() => {
        if (!authReady) return
        if (!user) return
        const currentUser = user

        async function load() {
            setDataLoading(true)
            try {
                const token = await currentUser.getIdToken()
                const headers = { Authorization: `Bearer ${token}` }
                // Each module fails independently: a stubbed/erroring endpoint
                // shows that module's empty state, never blanks the dashboard.
                const [moversJson, activityJson, pipelineJson, portfolioJson] = await Promise.all([
                    fetchJson<DashboardMovers>('/api/dashboard/movers?limit=3', { headers }).catch(() => null),
                    fetchJson<DashboardActivity>('/api/dashboard/activity?weeks=26', { headers }).catch(() => null),
                    fetchJson<{ data: PipelineCard[] }>('/api/pipeline', { headers }).catch(() => null),
                    fetchJson<{ data: PipelineCard[] }>('/api/portfolio', { headers }).catch(() => null),
                ])

                if (moversJson) setMovers(moversJson)
                if (activityJson) setActivity(activityJson)
                const activeCards = pipelineJson?.data ?? []
                const launchedCards = portfolioJson?.data ?? []
                setPipelineCards(activeCards)
                setWorkspaceCards(mergeWorkspaceCards(activeCards, launchedCards))
            } finally {
                setDataLoading(false)
            }
        }

        void load()
    }, [authReady, user])

    useEffect(() => {
        if (featureProfile === 'core') return
        if (!authReady || !user) return
        let active = true
        void (async () => {
            setMonitorLoading(true)
            try {
                const token = await user.getIdToken()
                const data = await loadDashboardMonitorSummary({ Authorization: `Bearer ${token}` })
                if (active) setMonitorSummary(data)
            } catch {
                if (active) setMonitorSummary(null)
            } finally {
                if (active) setMonitorLoading(false)
            }
        })()
        return () => { active = false }
    }, [authReady, user])
    if (loading) {
        return (
            <div className='max-w-7xl mx-auto px-8 py-8'>
                <div className='animate-pulse flex flex-col gap-6'>
                    <div className='h-8 w-72 rounded-md bg-(--color-surface-tint)' />
                    <div className='h-32 rounded-md bg-(--color-surface-tint)' />
                    <div className='grid grid-cols-1 gap-4 lg:grid-cols-4'>
                        <div className='h-96 rounded-md bg-(--color-surface-tint)' />
                        <div className='h-96 rounded-md bg-(--color-surface-tint) lg:col-span-2' />
                        <div className='h-96 rounded-md bg-(--color-surface-tint)' />
                    </div>
                </div>
            </div>
        )
    }

    // Core release profile: the monitor/goals/timeline modules are deferred, so
    // the home page composes only the discovery + pipeline modules, in two rows.
    if (featureProfile === 'core') {
        return (
            <div className='mx-auto flex w-full flex-col gap-4 px-5 py-6 [--dash-row-h:auto] md:px-8 md:py-6 lg:h-[calc(100vh-4rem)] lg:overflow-hidden'>
                <div className='flex min-h-0 flex-col gap-4 lg:grid lg:flex-1 lg:grid-rows-2 lg:overflow-hidden'>
                    <div className={dashboardRowClass}>
                        <div className={dashboardModuleClass}>
                            <ErrorBoundary>
                                <DiscoveryActivityCard activity={activity} loading={false} />
                            </ErrorBoundary>
                        </div>
                    </div>
                    <div className={`${dashboardRowClass} lg:grid-cols-[360px_minmax(0,1fr)_minmax(0,1fr)]`}>
                        <div className={dashboardModuleClass}>
                            <ErrorBoundary>
                                <DiscoveryMetricsCard activity={activity} loading={false} />
                            </ErrorBoundary>
                        </div>
                        <div className={dashboardModuleClass}>
                            <ErrorBoundary>
                                <MomentumMoversCard movers={movers} loading={false} />
                            </ErrorBoundary>
                        </div>
                        <div className={dashboardModuleClass}>
                            <ErrorBoundary>
                                <PipelineProgressListCard cards={pipelineCards} />
                            </ErrorBoundary>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Fit-one-screen on large displays: the page is capped to the viewport
    // (top bar is h-16) and three equal row grids share the remaining height.
    // Below lg each row falls back to a normal stacked layout.
    return (
        <div className='mx-auto flex w-full flex-col gap-4 px-5 py-6 [--dash-row-h:auto] md:px-8 md:py-6 lg:h-[calc(100vh-4rem)] lg:overflow-hidden'>
            <div className='flex min-h-0 flex-col gap-4 lg:grid lg:flex-1 lg:grid-rows-3 lg:overflow-hidden'>
                <div className={`${dashboardRowClass} lg:grid-cols-4`}>
                    <div className={dashboardModuleClass}>
                        <ErrorBoundary>
                            <DashboardRevenueCard summary={monitorSummary} loading={monitorLoading} />
                        </ErrorBoundary>
                    </div>

                    <div className={`${dashboardModuleClass} lg:col-span-2`}>
                        <ErrorBoundary>
                            <DiscoveryActivityCard activity={activity} loading={false} />
                        </ErrorBoundary>
                    </div>

                    <div className={dashboardModuleClass}>
                        <ErrorBoundary>
                            <DashboardCalendarCard cards={workspaceCards} />
                        </ErrorBoundary>
                    </div>
                </div>

                <div className={`${dashboardRowClass} lg:grid-cols-4`}>
                    <div className={dashboardModuleClass}>
                        <ErrorBoundary>
                            <DashboardProductHealthCard summary={monitorSummary} loading={monitorLoading} />
                        </ErrorBoundary>
                    </div>

                    <div className={dashboardModuleClass}>
                        <ErrorBoundary>
                            <DashboardActiveUsersCard summary={monitorSummary} loading={monitorLoading} />
                        </ErrorBoundary>
                    </div>

                    <div className={dashboardModuleClass}>
                        <ErrorBoundary>
                            <DashboardActivationRateCard summary={monitorSummary} loading={monitorLoading} />
                        </ErrorBoundary>
                    </div>

                    <div className={dashboardModuleClass}>
                        <ErrorBoundary>
                            <AccountGoalsCard />
                        </ErrorBoundary>
                    </div>
                </div>

                <div className={`${dashboardRowClass} lg:grid-cols-[360px_minmax(0,1fr)_minmax(0,1fr)]`}>
                    <div className={dashboardModuleClass}>
                        <ErrorBoundary>
                            <DiscoveryMetricsCard activity={activity} loading={false} />
                        </ErrorBoundary>
                    </div>

                    <div className={dashboardModuleClass}>
                        <ErrorBoundary>
                            <MomentumMoversCard movers={movers} loading={false} />
                        </ErrorBoundary>
                    </div>

                    <div className={dashboardModuleClass}>
                        <ErrorBoundary>
                            <PipelineProgressListCard cards={pipelineCards} />
                        </ErrorBoundary>
                    </div>
                </div>
            </div>
        </div>
    )
}
