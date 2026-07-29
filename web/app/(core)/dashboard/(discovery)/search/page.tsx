import { redirect } from 'next/navigation'
import { routes } from '@/app/util/routes'
import { redirectTarget, type LegacyPageProps } from '../../legacyRedirect'

export default async function LegacySearchPage({ searchParams }: LegacyPageProps) {
    redirect(redirectTarget(routes.core.explore, await searchParams))
}
