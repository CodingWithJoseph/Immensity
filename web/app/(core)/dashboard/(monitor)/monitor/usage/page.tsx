import { Suspense } from 'react'
import MonitorDashboard from '@/app/(core)/dashboard/(monitor)/monitor/MonitorDashboard'

export default function MonitorUsagePage() {
    return (
        <Suspense fallback={<div className="px-6 py-6 text-sm text-(--color-text-muted)">Loading usage...</div>}>
            <MonitorDashboard view="usage" />
        </Suspense>
    )
}
