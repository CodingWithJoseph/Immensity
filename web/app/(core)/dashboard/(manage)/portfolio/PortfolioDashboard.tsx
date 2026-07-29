'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { PipelineCard } from '@/lib/types/cluster'
import type { Issue } from '@/lib/types/issue'
import { fetchJson, ApiData } from '@/lib/fetchJson'
import PortfolioGrid from './components/PortfolioGrid'
import type { PortfolioOverviewMetrics } from './types'


export default function PortfolioDashboard({
    initialPipelineId = null,
}: {
    initialPipelineId?: string | null
    view?: 'portfolio'
}) {
    const searchParams = useSearchParams()
    const queryPipelineId = searchParams.get('pipelineId')
    const [products, setProducts] = useState<PipelineCard[]>([])
    const [overviewMetrics, setOverviewMetrics] = useState<PortfolioOverviewMetrics | null>(null)
    const [attentionIssues, setAttentionIssues] = useState<Issue[]>([])
    const [selectedProductId, setSelectedProductId] = useState<string | null>(initialPipelineId ?? queryPipelineId)
    const [loadingProducts, setLoadingProducts] = useState(true)
    const [loadingOverviewMetrics, setLoadingOverviewMetrics] = useState(true)
    const [loadingIssues, setLoadingIssues] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let active = true
        void (async () => {
            try {
                const json = await fetchJson<{ data: PipelineCard[] }>('/api/portfolio')
                if (!active) return
                const data = json?.data ?? []
                setProducts(data)
                setError(null)
                setSelectedProductId(current => {
                    const requested = initialPipelineId ?? queryPipelineId
                    if (requested && data.some(item => item.id === requested)) return requested
                    if (current && data.some(item => item.id === current)) return current
                    return data[0]?.id ?? null
                })
            } catch (err) {
                if (active) setError(err instanceof Error ? err.message : 'Something went wrong loading your portfolio.')
            } finally {
                if (active) setLoadingProducts(false)
            }
        })()
        return () => {
            active = false
        }
    }, [initialPipelineId, queryPipelineId])

    useEffect(() => {
        let active = true
        void fetchJson<ApiData<PortfolioOverviewMetrics>>('/api/portfolio/overview-metrics')
            .then(json => {
                if (active) setOverviewMetrics(json?.data ?? null)
            })
            .catch(() => {
                if (active) setOverviewMetrics(null)
            })
            .finally(() => {
                if (active) setLoadingOverviewMetrics(false)
            })
        return () => {
            active = false
        }
    }, [])

    useEffect(() => {
        let active = true
        void fetchJson<ApiData<Issue[]>>('/api/issues?status=open')
            .then(json => {
                if (active) setAttentionIssues(json?.data ?? [])
            })
            .catch(() => {
                if (active) setAttentionIssues([])
            })
            .finally(() => {
                if (active) setLoadingIssues(false)
            })
        return () => {
            active = false
        }
    }, [])

    function updatePortfolioProduct(updatedProduct: PipelineCard) {
        setProducts(current => current.map(item => item.id === updatedProduct.id ? updatedProduct : item))
    }

    function removePortfolioProduct(id: string) {
        setProducts(current => current.filter(item => item.id !== id))
        setSelectedProductId(current => current === id ? null : current)
    }

    return (
        <div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto px-6 py-6">
            {error && (
                <div className="rounded-md border border-(--color-error) px-4 py-3 text-sm text-(--color-error)">
                    {error}
                </div>
            )}

            <PortfolioGrid
                products={products}
                isLoadingProducts={loadingProducts}
                overviewMetrics={overviewMetrics}
                isLoadingMetrics={loadingOverviewMetrics}
                attentionIssues={attentionIssues}
                isLoadingIssues={loadingIssues}
                selectedProductId={selectedProductId}
                onSelectedProductIdChange={setSelectedProductId}
                onProductUpdate={updatePortfolioProduct}
                onProductRemove={removePortfolioProduct}
            />
        </div>
    )
}
