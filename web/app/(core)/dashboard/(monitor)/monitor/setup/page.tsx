import { Suspense } from 'react'
import MonitorSetupDashboard from '@/app/(core)/dashboard/(monitor)/monitor/MonitorSetupDashboard'

export default function MonitorSetupPage() {
    return (
        <Suspense fallback={<div className="px-6 py-6 text-sm text-(--color-text-muted)">Loading setup...</div>}>
            <MonitorSetupDashboard />
        </Suspense>
    )
}
