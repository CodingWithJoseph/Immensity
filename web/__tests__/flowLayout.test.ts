import { layoutFlow, flowNodeId, shortPath } from '@/lib/flowLayout'
import type { FlowEdge, FlowNode } from '@/app/(core)/dashboard/(monitor)/monitor/types'

const nodes: FlowNode[] = [
    { url: 'https://app.test/home', visits: 100 },
    { url: 'https://app.test/cart', visits: 60 },
    { url: 'https://app.test/checkout', visits: 30 },
]

function idOf(url: string) {
    return flowNodeId(nodes.findIndex(n => n.url === url))
}

describe('layoutFlow', () => {
    it('ranks a chain left→right', () => {
        const edges: FlowEdge[] = [
            { from: 'https://app.test/home', to: 'https://app.test/cart', count: 40 },
            { from: 'https://app.test/cart', to: 'https://app.test/checkout', count: 20 },
        ]
        const layout = layoutFlow(nodes, edges)
        const x = (url: string) => layout.nodes.find(n => n.id === idOf(url))!.x
        expect(x('https://app.test/home')).toBeLessThan(x('https://app.test/cart'))
        expect(x('https://app.test/cart')).toBeLessThan(x('https://app.test/checkout'))
    })

    it('keeps every laid-out edge pointing at a real node', () => {
        const edges: FlowEdge[] = [{ from: 'https://app.test/home', to: 'https://app.test/cart', count: 5 }]
        const layout = layoutFlow(nodes, edges)
        const ids = new Set(layout.nodes.map(n => n.id))
        for (const e of layout.edges) {
            expect(ids.has(e.source)).toBe(true)
            expect(ids.has(e.target)).toBe(true)
        }
    })

    it('drops self-loops and edges to unknown pages', () => {
        const edges: FlowEdge[] = [
            { from: 'https://app.test/home', to: 'https://app.test/home', count: 9 }, // self-loop
            { from: 'https://app.test/home', to: 'https://app.test/ghost', count: 7 }, // unknown target
            { from: 'https://app.test/home', to: 'https://app.test/cart', count: 3 },
        ]
        const layout = layoutFlow(nodes, edges)
        expect(layout.edges).toHaveLength(1)
        expect(layout.edges[0]).toMatchObject({ source: idOf('https://app.test/home'), target: idOf('https://app.test/cart') })
    })

    it('handles a cycle without throwing', () => {
        const edges: FlowEdge[] = [
            { from: 'https://app.test/home', to: 'https://app.test/cart', count: 8 },
            { from: 'https://app.test/cart', to: 'https://app.test/home', count: 4 },
        ]
        expect(() => layoutFlow(nodes, edges)).not.toThrow()
        const layout = layoutFlow(nodes, edges)
        expect(layout.edges).toHaveLength(2)
        expect(layout.maxCount).toBe(8)
        expect(layout.maxVisits).toBe(100)
    })
})

describe('shortPath', () => {
    it('reduces a url to path + query', () => {
        expect(shortPath('https://app.test/cart?ref=home')).toBe('/cart?ref=home')
        expect(shortPath('not a url')).toBe('not a url')
    })
})
