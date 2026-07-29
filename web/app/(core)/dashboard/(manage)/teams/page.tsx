import { redirect } from 'next/navigation'
import { routes } from '@/app/util/routes'
import { redirectTarget, type LegacyPageProps } from '../../legacyRedirect'

export default async function LegacyTeamsPage({ searchParams }: LegacyPageProps) {
    redirect(redirectTarget(routes.core.teams, await searchParams))
}
