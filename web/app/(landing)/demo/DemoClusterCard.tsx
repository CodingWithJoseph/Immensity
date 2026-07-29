'use client'

export interface DemoClusterCardProps {
    cluster: {
        name: string
        summary: string
        post_count: number
        growth_rate: number | null
        sample_posts: { id: string; title: string }[]
    }
}

function momentumFor(growthRate: number | null) {
    if (growthRate === null || growthRate === undefined) return null
    if (growthRate > 0.2) return 'Growing'
    if (growthRate > 0) return 'Steady'
    return 'Fading'
}

export default function DemoClusterCard({ cluster }: DemoClusterCardProps) {
    const momentum = momentumFor(cluster.growth_rate)
    const samplePosts = cluster.sample_posts?.slice(0, 3) ?? []

    return (
        <article className="pf-demo-card">
            <p className="pf-demo-card__meta">{cluster.post_count} post{cluster.post_count !== 1 ? 's' : ''}</p>
            <h3>{cluster.name || 'Unnamed cluster'}</h3>
            {cluster.summary ? (
                <p className="pf-demo-card__summary">{cluster.summary}</p>
            ) : samplePosts.length > 0 ? (
                <p className="pf-demo-card__summary">{samplePosts.map((post) => post.title).join(' · ')}</p>
            ) : null}
            {momentum && <span className="pf-demo-card__momentum">{momentum}</span>}
            <a href="/sign-up" className="pf-demo-card__cta">Sign up to explore →</a>
        </article>
    )
}
