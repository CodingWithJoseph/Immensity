import { render, screen, fireEvent } from '@testing-library/react'

// Stub React Flow so jsdom doesn't need real layout/measurement. The stub
// renders a button per node wired to onNodeClick, and exposes the edge count.
jest.mock('@xyflow/react', () => {
    const React = require('react')
    type MockNode = { id: string; selected?: boolean; data: { url: string } }
    type MockProps = {
        nodes: MockNode[]
        edges: unknown[]
        onNodeClick: (e: unknown, n: MockNode) => void
        onPaneClick?: () => void
    }
    return {
        __esModule: true,
        ReactFlow: ({ nodes, edges, onNodeClick, onPaneClick }: MockProps) =>
            React.createElement('div', { 'data-testid': 'rf', 'data-edges': edges.length, onClick: () => onPaneClick?.() },
                nodes.map(n =>
                    React.createElement('button', {
                        key: n.id,
                        'data-testid': `node-${n.id}`,
                        'data-selected': n.selected ? '1' : '0',
                        onClick: (e: React.MouseEvent) => { e.stopPropagation(); onNodeClick({}, n) },
                    }, n.data.url),
                )),
        Background: () => null,
        Controls: () => null,
        MarkerType: { ArrowClosed: 'arrowclosed' },
        Position: { Left: 'left', Right: 'right' },
        Handle: () => null,
    }
})

import FlowGraph from '@/app/(core)/dashboard/(monitor)/monitor/components/FlowGraph'
import type { FlowData } from '@/app/(core)/dashboard/(monitor)/monitor/types'

const DATA: FlowData = {
    windowDays: 14,
    nodes: [
        { url: 'https://app.test/home', visits: 100 },
        { url: 'https://app.test/cart', visits: 60 },
    ],
    edges: [
        { from: 'https://app.test/home', to: 'https://app.test/cart', count: 40 },
        { from: 'https://app.test/home', to: 'https://app.test/home', count: 9 }, // self-loop, dropped
    ],
}

describe('FlowGraph', () => {
    it('renders a node per page and only valid edges', () => {
        render(<FlowGraph data={DATA} selectedId={null} onSelect={() => {}} />)
        expect(screen.getByText('https://app.test/home')).toBeInTheDocument()
        expect(screen.getByText('https://app.test/cart')).toBeInTheDocument()
        // Self-loop dropped → 1 edge.
        expect(screen.getByTestId('rf')).toHaveAttribute('data-edges', '1')
    })

    it('selects the node that was clicked', () => {
        const onSelect = jest.fn()
        render(<FlowGraph data={DATA} selectedId={null} onSelect={onSelect} />)
        fireEvent.click(screen.getByText('https://app.test/cart'))
        expect(onSelect).toHaveBeenCalledWith('n1')
    })

    it('marks the selected node', () => {
        render(<FlowGraph data={DATA} selectedId="n0" onSelect={() => {}} />)
        expect(screen.getByTestId('node-n0')).toHaveAttribute('data-selected', '1')
        expect(screen.getByTestId('node-n1')).toHaveAttribute('data-selected', '0')
    })
})
