'use client'

import { useState, type KeyboardEvent, type ReactNode } from 'react'
import {
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
    type ColumnDef,
    type OnChangeFn,
    type SortingState,
} from '@tanstack/react-table'

export type { ColumnDef } from '@tanstack/react-table'

export type DataTableProps<TData, TValue = unknown> = {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    emptyMessage?: string
    isLoading?: boolean
    toolbar?: ReactNode
    actions?: ReactNode
    className?: string
    scrollClassName?: string
    surfaceClassName?: string
    onRowClick?: (row: TData) => void
    getRowId?: (row: TData) => string
    selectedRowId?: string | null
    sorting?: SortingState
    onSortingChange?: OnChangeFn<SortingState>
}

/**
 * Generic app table built on TanStack Table.
 *
 * @example
 * const columns: ColumnDef<Person>[] = [
 *   { accessorKey: 'name', header: 'Name' },
 *   { accessorKey: 'role', header: 'Role', cell: ({ row }) => <strong>{row.original.role}</strong> },
 * ]
 *
 * <DataTable columns={columns} data={people} emptyMessage="No people found." />
 */
export default function DataTable<TData, TValue = unknown>({
    columns,
    data,
    emptyMessage = 'No results found.',
    isLoading = false,
    toolbar,
    actions,
    className = '',
    scrollClassName = '',
    surfaceClassName = 'bg-(--color-surface)',
    onRowClick,
    getRowId,
    selectedRowId = null,
    sorting: controlledSorting,
    onSortingChange,
}: DataTableProps<TData, TValue>) {
    const [internalSorting, setInternalSorting] = useState<SortingState>([])
    const sorting = controlledSorting ?? internalSorting
    // TanStack Table intentionally returns a stateful table instance with non-memoizable functions.
    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        columns,
        data,
        state: { sorting },
        onSortingChange: onSortingChange ?? setInternalSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getRowId,
    })
    const columnCount = Math.max(table.getVisibleLeafColumns().length, 1)

    function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, row: TData) {
        if (!onRowClick || (event.key !== 'Enter' && event.key !== ' ')) return
        event.preventDefault()
        onRowClick(row)
    }

    return (
        <section className={`min-w-0 overflow-hidden rounded-md border border-(--color-border) ${surfaceClassName} ${className}`}>
            {(toolbar || actions) && (
                <div className="flex flex-col gap-3 border-b border-(--color-border) px-4 py-3 sm:flex-row sm:items-center">
                    {toolbar && <div className="min-w-0 flex-1">{toolbar}</div>}
                    {actions && <div className="shrink-0 sm:ml-auto">{actions}</div>}
                </div>
            )}

            <div className={`overflow-x-auto ${scrollClassName}`}>
                <table
                    aria-busy={isLoading || undefined}
                    className="min-w-full border-collapse text-left"
                    style={{ width: table.getTotalSize() }}
                >
                    <thead className="border-b border-(--color-border) bg-(--color-bg)">
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <th
                                        key={header.id}
                                        colSpan={header.colSpan}
                                        scope="col"
                                        className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-(--color-text-muted)"
                                        style={{ width: header.getSize() }}
                                    >
                                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                                            <button
                                                type="button"
                                                onClick={header.column.getToggleSortingHandler()}
                                                className="inline-flex w-full items-center gap-1.5 text-left hover:text-(--color-text) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus)"
                                            >
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                <span aria-hidden className="text-[10px]">
                                                    {header.column.getIsSorted() === 'asc' ? '↑' : header.column.getIsSorted() === 'desc' ? '↓' : '↕'}
                                                </span>
                                            </button>
                                        ) : flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {isLoading ? (
                            Array.from({ length: 3 }, (_, index) => (
                                <tr key={`loading-${index}`} className="border-b border-(--color-border) last:border-b-0">
                                    <td colSpan={columnCount} className="px-4 py-4">
                                        {index === 0 && <span className="sr-only">Loading data</span>}
                                        <div aria-hidden className="h-4 w-full animate-pulse rounded-sm bg-(--color-border)" />
                                    </td>
                                </tr>
                            ))
                        ) : table.getRowModel().rows.length > 0 ? (
                            table.getRowModel().rows.map(row => {
                                const selected = row.id === selectedRowId
                                return <tr
                                    key={row.id}
                                    tabIndex={onRowClick ? 0 : undefined}
                                    aria-selected={onRowClick ? selected : undefined}
                                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                                    onKeyDown={event => handleRowKeyDown(event, row.original)}
                                    className={`border-b border-(--color-border) transition-colors last:border-b-0 ${selected ? 'bg-(--color-blue-soft)' : ''} ${onRowClick ? 'cursor-pointer hover:bg-(--color-bg) focus-visible:bg-(--color-bg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--color-focus)' : ''}`}
                                >
                                    {row.getVisibleCells().map(cell => (
                                        <td
                                            key={cell.id}
                                            className="px-4 py-3 text-sm text-(--color-text)"
                                            style={{ width: cell.column.getSize() }}
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            })
                        ) : (
                            <tr>
                                <td colSpan={columnCount} className="px-4 py-10 text-center text-sm text-(--color-text-muted)">
                                    {emptyMessage}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    )
}
