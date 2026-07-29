import { Suspense } from 'react'
import MonitorDashboard from '@/app/(core)/dashboard/(monitor)/monitor/MonitorDashboard'

export default function MonitorTrafficPage() {
    return (
        <Suspense fallback={<div className="px-6 py-6 text-sm text-(--color-text-muted)">Loading traffic...</div>}>
            <MonitorDashboard view="traffic" />
        </Suspense>
    )
}
