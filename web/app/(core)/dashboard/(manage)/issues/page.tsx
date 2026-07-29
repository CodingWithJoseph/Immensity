import { redirect } from 'next/navigation'
import { routes } from '@/app/util/routes'
import { redirectTarget, type LegacyPageProps } from '../../legacyRedirect'

export default async function LegacyIssuesPage({ searchParams }: LegacyPageProps) {
    redirect(redirectTarget(routes.core.issues, await searchParams))
}
