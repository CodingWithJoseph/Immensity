'use client'
import { useMemo } from 'react'
import {
    ReactFlow, Background, Controls, MarkerType,
    type Edge, type Node, type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { FlowData } from '../types'
import { layoutFlow } from '@/lib/flowLayout'
import FlowNodeCard, { type FlowNodeData } from './FlowNodeCard'

const nodeTypes = { flowCard: FlowNodeCard }

export default function FlowGraph({
    data,
    selectedId,
    onSelect,
}: {
    data: FlowData
    selectedId: string | null
    onSelect: (id: string | null) => void
}) {
    const { nodes, edges } = useMemo(() => {
        const layout = layoutFlow(data.nodes, data.edges)
        const rfNodes: Node<FlowNodeData>[] = layout.nodes.map(n => ({
            id: n.id,
            type: 'flowCard',
            position: { x: n.x, y: n.y },
            data: { url: n.url, visits: n.visits, fraction: n.visits / layout.maxVisits },
            selected: n.id === selectedId,
        }))
        const rfEdges: Edge[] = layout.edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            // Heavier paths read as thicker, like the screenshot's request bars.
            style: { stroke: 'var(--color-border)', strokeWidth: 1 + (e.count / layout.maxCount) * 4 },
            markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--color-text-faint)' },
        }))
        return { nodes: rfNodes, edges: rfEdges }
    }, [data, selectedId])

    const handleNodeClick: NodeMouseHandler = (_event, node) => onSelect(node.id)

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={handleNodeClick}
            onPaneClick={() => onSelect(null)}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            fitView
            proOptions={{ hideAttribution: true }}
            minZoom={0.2}
        >
            <Background color="var(--color-border)" gap={20} />
            <Controls showInteractive={false} />
        </ReactFlow>
    )
}
