import { redirect } from 'next/navigation'
import { routes } from '@/app/util/routes'

export default async function LegacyIssueDetailPage({ params }: { params: Promise<{ issueId: string }> }) {
    const { issueId } = await params
    redirect(`${routes.core.issues}/${issueId}`)
}
