import dagre from '@dagrejs/dagre'
import type { FlowEdge, FlowNode } from '@/app/(core)/dashboard/(monitor)/monitor/types'

export const FLOW_NODE_WIDTH = 220
export const FLOW_NODE_HEIGHT = 84

// Stable React-Flow node id for the node at `index` in the FlowData.nodes array.
// Shared so the graph and the detail panel agree on which node a selection means.
export function flowNodeId(index: number): string {
    return `n${index}`
}

export interface LaidOutNode {
    id: string
    url: string
    visits: number
    x: number
    y: number
}

export interface LaidOutEdge {
    id: string
    source: string
    target: string
    count: number
}

export interface FlowLayout {
    nodes: LaidOutNode[]
    edges: LaidOutEdge[]
    maxVisits: number
    maxCount: number
}

interface LayoutOpts {
    nodeWidth?: number
    nodeHeight?: number
    /** Horizontal gap between ranks (left→right separation). */
    rankSep?: number
    /** Vertical gap between nodes in the same rank. */
    nodeSep?: number
}

// Lay the aggregate flow graph out left→right in ranked columns using dagre.
// dagre breaks cycles internally, so session-derived back-edges (page A→B→A) are
// safe. Pure and deterministic so it can be unit-tested without React Flow.
export function layoutFlow(nodes: FlowNode[], edges: FlowEdge[], opts: LayoutOpts = {}): FlowLayout {
    const nodeWidth = opts.nodeWidth ?? FLOW_NODE_WIDTH
    const nodeHeight = opts.nodeHeight ?? FLOW_NODE_HEIGHT

    // Stable url→id mapping; React Flow ids must be strings and url-safe.
    const idByUrl = new Map<string, string>()
    nodes.forEach((node, i) => idByUrl.set(node.url, flowNodeId(i)))

    // Keep only edges whose endpoints both survived the node cap, and drop
    // self-loops which add nothing to a journey graph.
    const keptEdges = edges.filter(e => e.from !== e.to && idByUrl.has(e.from) && idByUrl.has(e.to))

    const g = new dagre.graphlib.Graph()
    g.setGraph({ rankdir: 'LR', ranksep: opts.rankSep ?? 120, nodesep: opts.nodeSep ?? 28, marginx: 16, marginy: 16 })
    g.setDefaultEdgeLabel(() => ({}))

    for (const node of nodes) {
        g.setNode(idByUrl.get(node.url)!, { width: nodeWidth, height: nodeHeight })
    }
    for (const edge of keptEdges) {
        g.setEdge(idByUrl.get(edge.from)!, idByUrl.get(edge.to)!)
    }

    dagre.layout(g)

    const laidOutNodes: LaidOutNode[] = nodes.map(node => {
        const id = idByUrl.get(node.url)!
        const pos = g.node(id)
        // dagre centres nodes; React Flow positions by top-left corner.
        return { id, url: node.url, visits: node.visits, x: pos.x - nodeWidth / 2, y: pos.y - nodeHeight / 2 }
    })

    const laidOutEdges: LaidOutEdge[] = keptEdges.map(edge => ({
        id: `${idByUrl.get(edge.from)}-${idByUrl.get(edge.to)}`,
        source: idByUrl.get(edge.from)!,
        target: idByUrl.get(edge.to)!,
        count: edge.count,
    }))

    return {
        nodes: laidOutNodes,
        edges: laidOutEdges,
        maxVisits: nodes.reduce((m, n) => Math.max(m, n.visits), 0) || 1,
        maxCount: keptEdges.reduce((m, e) => Math.max(m, e.count), 0) || 1,
    }
}

// Short, readable label for a page url (path + query, no origin). Shared by the
// node cards and the detail panel.
export function shortPath(url: string): string {
    try {
        const u = new URL(url)
        return (u.pathname || '/') + (u.search || '')
    } catch {
        return url
    }
}
