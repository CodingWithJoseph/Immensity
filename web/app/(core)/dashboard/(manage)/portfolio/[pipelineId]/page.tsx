import { redirect } from 'next/navigation'
import { routes } from '@/app/util/routes'

export default async function OldPortfolioProductPage({ params }: { params: Promise<{ pipelineId: string }> }) {
    const { pipelineId } = await params
    redirect(`${routes.core.portfolio}?pipelineId=${pipelineId}`)
}
