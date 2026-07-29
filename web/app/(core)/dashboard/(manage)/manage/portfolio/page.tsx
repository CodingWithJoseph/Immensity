import { Suspense } from 'react'
import PortfolioDashboard from '@/app/(core)/dashboard/(manage)/portfolio/PortfolioDashboard'

export default function PortfolioPage() {
    return (
        <Suspense fallback={<div className="px-6 py-6 text-sm text-(--color-text-muted)">Loading portfolio...</div>}>
            <PortfolioDashboard view="portfolio" />
        </Suspense>
    )
}
