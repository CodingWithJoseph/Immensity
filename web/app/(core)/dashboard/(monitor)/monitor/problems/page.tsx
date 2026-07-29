import { Suspense } from 'react'
import MonitorDashboard from '@/app/(core)/dashboard/(monitor)/monitor/MonitorDashboard'

export default function MonitorProblemsPage() {
    return (
        <Suspense fallback={<div className="px-6 py-6 text-sm text-(--color-text-muted)">Loading problems...</div>}>
            <MonitorDashboard view="problems" />
        </Suspense>
    )
}
