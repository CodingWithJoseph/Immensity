import { Suspense } from 'react'
import MonitorDashboard from '@/app/(core)/dashboard/(monitor)/monitor/MonitorDashboard'

export default function MonitorLogsPage() {
    return (
        <Suspense fallback={<div className="px-6 py-6 text-sm text-(--color-text-muted)">Loading logs...</div>}>
            <MonitorDashboard view="logs" />
        </Suspense>
    )
}
