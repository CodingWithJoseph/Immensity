import { redirect } from 'next/navigation'
import { routes } from '@/app/util/routes'
import { redirectTarget, type LegacyPageProps } from '../../legacyRedirect'

export default async function LegacyPostsPage({ searchParams }: LegacyPageProps) {
    redirect(redirectTarget(routes.core.posts, await searchParams))
}
