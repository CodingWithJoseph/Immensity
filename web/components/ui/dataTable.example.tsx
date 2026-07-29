import type { ColumnDef } from './DataTable'

export type ExamplePerson = {
    id: string
    name: string
    role: string
}

// Type-safe column definitions can live beside the feature that consumes DataTable.
export const examplePersonColumns: ColumnDef<ExamplePerson>[] = [
    {
        accessorKey: 'name',
        header: 'Name',
    },
    {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => <span className="font-medium">{row.original.role}</span>,
    },
]
