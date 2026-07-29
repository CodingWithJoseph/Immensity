import { Cluster } from '@/lib/types/cluster'
import { DashboardSignalCluster } from '@/lib/types/dashboard'
import TrendingClusterCard from '@/app/(core)/dashboard/components/TrendingClusterCard'
import DashboardEmptyState from '@/app/(core)/dashboard/components/DashboardEmptyState'
import FeatureContextDot from '@/app/(core)/dashboard/components/FeatureContextDot'

const fmtScore = (v: number | null) => (v == null ? '-' : String(Math.round(v)))

export function TrendingClustersCard({ clusters }: { clusters: Cluster[] }) {
    const trending = [...clusters]
        .filter(c => c.trending)
        .sort((a, b) => (b.signalScore ?? 0) - (a.signalScore ?? 0))
        .slice(0, 3)

    return (
        <section className='flex h-full min-h-0 flex-col gap-2'>
            <div className='flex items-center gap-2'>
                <FeatureContextDot category='monitor' />
                <h2 className='text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)'>Trending clusters</h2>
            </div>
            {trending.length === 0 ? (
                <DashboardEmptyState>No trending clusters right now.</DashboardEmptyState>
            ) : (
                <div className='flex min-h-0 flex-1 flex-col rounded-lg border border-(--color-border) bg-(--color-surface-raised) p-4 shadow-[var(--shadow-sm)]'>
                    <div className='flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1'>
                        {trending.map(c => (
                            <TrendingClusterCard
                                key={`t-${c.id}`}
                                id={c.id}
                                name={c.name}
                                postCount={c.postCount}
                                metricLabel='Signal score'
                                metricValue={fmtScore(c.signalScore)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </section>
    )
}

export function TopSignalsCard({ signalClusters }: { signalClusters: DashboardSignalCluster[] }) {
    const topSignals = [...signalClusters]
        .sort((a, b) => (b.signalScore ?? 0) - (a.signalScore ?? 0))
        .slice(0, 3)

    return (
        <section className='flex h-full min-h-0 flex-col gap-2'>
            <div className='flex items-center gap-2'>
                <FeatureContextDot category='monitor' />
                <h2 className='text-xs font-semibold uppercase tracking-widest text-(--color-text-muted)'>Top signals</h2>
            </div>
            {topSignals.length === 0 ? (
                <DashboardEmptyState>No signal data yet.</DashboardEmptyState>
            ) : (
                <div className='flex min-h-0 flex-1 flex-col rounded-lg border border-(--color-border) bg-(--color-surface-raised) p-4 shadow-[var(--shadow-sm)]'>
                    <div className='flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1'>
                        {topSignals.map(c => (
                            <TrendingClusterCard
                                key={`s-${c.id}`}
                                id={c.id}
                                name={c.name}
                                postCount={c.postCount}
                                metricLabel='Signal score'
                                metricValue={fmtScore(c.signalScore)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </section>
    )
}

export default function IntelligenceFeedColumn({
    clusters,
    signalClusters,
}: {
    clusters: Cluster[]
    signalClusters: DashboardSignalCluster[]
}) {
    return (
        <div className='flex h-full min-h-0 flex-col gap-4'>
            <TrendingClustersCard clusters={clusters} />
            <TopSignalsCard signalClusters={signalClusters} />
        </div>
    )
}
