import { redirect } from 'next/navigation'
import { routes } from '@/app/util/routes'

export default function MonitorPortfolioPage() {
    redirect(routes.core.portfolio)
}
