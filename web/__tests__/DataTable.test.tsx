import { fireEvent, render, screen } from '@testing-library/react'
import DataTable, { type ColumnDef } from '@/components/ui/DataTable'

type Person = {
    id: string
    name: string
    role: string
}

const columns: ColumnDef<Person>[] = [
    {
        accessorKey: 'name',
        header: 'Name',
    },
    {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => <strong>{row.original.role.toUpperCase()}</strong>,
    },
]

const data: Person[] = [
    { id: 'person-1', name: 'Ada Lovelace', role: 'Engineer' },
]

describe('DataTable', () => {
    it('renders dynamic columns, rows, and custom cells', () => {
        render(<DataTable columns={columns} data={data} />)

        expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()
        expect(screen.getByRole('columnheader', { name: 'Role' })).toBeInTheDocument()
        expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
        expect(screen.getByText('ENGINEER')).toBeInTheDocument()
    })

    it('renders toolbar and right-side action slots', () => {
        render(
            <DataTable
                columns={columns}
                data={data}
                toolbar={<label htmlFor="table-search">Search</label>}
                actions={<button type="button">Add person</button>}
            />,
        )

        expect(screen.getByText('Search')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Add person' })).toBeInTheDocument()
    })

    it('shows a full-width empty state', () => {
        render(<DataTable columns={columns} data={[]} emptyMessage="No people found." />)

        expect(screen.getByText('No people found.').closest('td')).toHaveAttribute('colspan', '2')
    })

    it('shows loading placeholders instead of data rows', () => {
        render(<DataTable columns={columns} data={data} isLoading />)

        expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')
        expect(screen.getByText('Loading data')).toBeInTheDocument()
        expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument()
    })

    it('supports mouse and keyboard row activation', () => {
        const onRowClick = jest.fn()
        render(<DataTable columns={columns} data={data} onRowClick={onRowClick} />)
        const row = screen.getByText('Ada Lovelace').closest('tr')!

        fireEvent.click(row)
        fireEvent.keyDown(row, { key: 'Enter' })

        expect(onRowClick).toHaveBeenNthCalledWith(1, data[0])
        expect(onRowClick).toHaveBeenNthCalledWith(2, data[0])
    })

    it('shows sortable headers and a selected row state', () => {
        const rows = [
            { id: 'person-1', name: 'Ada Lovelace', role: 'Engineer' },
            { id: 'person-2', name: 'Grace Hopper', role: 'Admiral' },
        ]
        render(<DataTable columns={columns} data={rows} getRowId={row => row.id} selectedRowId="person-2" onRowClick={() => {}} />)

        const nameSort = screen.getByRole('button', { name: /Name/ })
        expect(nameSort).toHaveTextContent('↕')
        fireEvent.click(nameSort)
        expect(nameSort).toHaveTextContent('↑')
        expect(screen.getByText('Grace Hopper').closest('tr')).toHaveAttribute('aria-selected', 'true')
    })

    it('wraps the table in a horizontal overflow container', () => {
        const { container } = render(<DataTable columns={columns} data={data} className="test-table" />)

        expect(container.querySelector('.overflow-x-auto')).toBeInTheDocument()
        expect(container.firstElementChild).toHaveClass('test-table')
    })
})
