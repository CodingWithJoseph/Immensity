import { Suspense } from 'react'
import MonitorDashboard from '@/app/(core)/dashboard/(monitor)/monitor/MonitorDashboard'

export default function MonitorSessionsPage() {
    return (
        <Suspense fallback={<div className="px-6 py-6 text-sm text-(--color-text-muted)">Loading sessions...</div>}>
            <MonitorDashboard view="sessions" />
        </Suspense>
    )
}
