import { redirect } from 'next/navigation'
import { routes } from '@/app/util/routes'

// Portfolio now lives under the literal `manage/` segment
// (/dashboard/manage/portfolio). Redirect the old group-only URL so existing
// bookmarks to /dashboard/portfolio don't 404.
export default function LegacyPortfolioPage() {
    redirect(routes.core.portfolio)
}
