export type FeatureCategory = 'manage' | 'build' | 'monitor' | 'market'

const categoryClass: Record<FeatureCategory, string> = {
    manage: 'bg-(--color-feat-manage)',
    build: 'bg-(--color-feat-build)',
    monitor: 'bg-(--color-feat-monitor)',
    market: 'bg-(--color-feat-market)',
}

export default function FeatureContextDot({ category }: { category: FeatureCategory }) {
    return (
        <div
            aria-hidden
            data-feature-category={category}
            className={`h-2 w-2 shrink-0 rounded-full ${categoryClass[category]}`}
        />
    )
}
