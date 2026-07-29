'use client'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { FLOW_NODE_HEIGHT, FLOW_NODE_WIDTH, shortPath } from '@/lib/flowLayout'

export interface FlowNodeData extends Record<string, unknown> {
    url: string
    visits: number
    /** visits / maxVisits, 0..1, drives the request bar width. */
    fraction: number
}

// A service/page card in the flow graph: title + a request count with a bar
// scaled to the busiest node, echoing the screenshot's per-node request bars.
// Selection is owned by the graph; we only reflect it with an accent ring.
export default function FlowNodeCard({ data, selected }: NodeProps & { data: FlowNodeData }) {
    return (
        <div
            style={{ width: FLOW_NODE_WIDTH, height: FLOW_NODE_HEIGHT }}
            className={`flex flex-col justify-between overflow-hidden rounded-lg border bg-(--color-card) px-3 py-2 shadow-[var(--shadow-sm)] transition-colors ${
                selected ? 'border-(--color-accent) ring-1 ring-(--color-accent)' : 'border-(--color-border)'
            }`}
        >
            <Handle type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-0 !bg-(--color-text-faint)" />
            <p className="truncate text-sm font-medium text-(--color-text)" title={data.url}>{shortPath(data.url)}</p>
            <div>
                <div className="flex items-center justify-between text-[11px] text-(--color-text-muted)">
                    <span>Requests</span>
                    <span className="tabular-nums font-medium text-(--color-text)">{data.visits.toLocaleString()}</span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-(--color-bg)">
                    <div className="h-full rounded-full bg-(--color-accent)" style={{ width: `${Math.max(data.fraction * 100, 3)}%` }} />
                </div>
            </div>
            <Handle type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-0 !bg-(--color-text-faint)" />
        </div>
    )
}
