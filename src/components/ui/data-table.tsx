import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table'
import { Fragment, type ReactNode } from 'react'
import { AppPagination } from '@/components/ui/app-pagination'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export interface DataTableProps<TData extends RowData> {
  columns?: ColumnDef<TData>[]
  data: TData[]
  headers?: Array<string | { label: string; className?: string }>
  renderRow?: (row: TData, index: number) => ReactNode
  emptyMessage?: ReactNode
  label?: string
  pageSize?: number
  loading?: boolean
  loadingMessage?: string
  error?: ReactNode
  pagination?: false | {
    pageIndex: number
    pageSize: number
    totalItems?: number
    onPageChange: (pageIndex: number) => void
    onPageSizeChange?: (pageSize: number) => void
  }
  containerClassName?: string
  tableClassName?: string
  emptyClassName?: string
  rowClassName?: string
  headerRowClassName?: string
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  headers,
  renderRow,
  emptyMessage = 'No results.',
  label,
  pageSize = 10,
  loading = false,
  loadingMessage = 'Loading…',
  error,
  pagination,
  containerClassName = 'rounded-card border border-line bg-surface',
  tableClassName,
  emptyClassName = 'h-28 text-center text-sm text-ink-muted',
  rowClassName,
  headerRowClassName,
}: DataTableProps<TData>) {
  if (!columns && (!headers || !renderRow)) throw new Error('DataTable requires columns or both headers and renderRow.')
  const table = useReactTable({
    data,
    columns: columns ?? [],
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: pagination === false || Boolean(pagination),
    state: pagination ? { pagination: { pageIndex: pagination.pageIndex, pageSize: pagination.pageSize } } : undefined,
    onPaginationChange: pagination ? (updater) => {
      const next = typeof updater === 'function' ? updater({ pageIndex: pagination.pageIndex, pageSize: pagination.pageSize }) : updater
      if (next.pageSize !== pagination.pageSize) pagination.onPageSizeChange?.(next.pageSize)
      if (next.pageIndex !== pagination.pageIndex) pagination.onPageChange(next.pageIndex)
    } : undefined,
    initialState: pagination ? undefined : { pagination: { pageIndex: 0, pageSize } },
  })
  const renderedRows = pagination === false || pagination ? data : data.slice(
    table.getState().pagination.pageIndex * table.getState().pagination.pageSize,
    (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
  )

  return (
    <div className={containerClassName}>
      {loading ? <p className="px-6 py-10 text-center text-sm text-ink-muted">{loadingMessage}</p>
        : error ? <div role="alert" className="m-5 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>
          : <div className="overflow-x-auto"><Table aria-label={label} className={tableClassName}>
        {headers ? <TableHeader><TableRow>{headers.map((header, index) => {
          const item = typeof header === 'string' ? { label: header } : header
          return <TableHead key={`${item.label}-${index}`} className={item.className}>{item.label}</TableHead>
        })}</TableRow></TableHeader> : <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className={headerRowClassName}>
              {group.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>}
        <TableBody>
          {renderRow ? (renderedRows.length ? renderedRows.map((row, index) => <Fragment key={(row as { id?: string }).id ?? index}>{renderRow(row, index)}</Fragment>) : (
            <TableRow><TableCell colSpan={headers?.length ?? table.getAllLeafColumns().length} className={emptyClassName}>{emptyMessage}</TableCell></TableRow>
          )) : table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className={rowClassName} data-state={row.getIsSelected() && 'selected'}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={table.getAllLeafColumns().length} className={emptyClassName}>
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table></div>}
      {pagination !== false && <AppPagination
        pageIndex={table.getState().pagination.pageIndex}
        pageSize={table.getState().pagination.pageSize}
        totalItems={pagination?.totalItems ?? (renderRow ? data.length : table.getPrePaginationRowModel().rows.length)}
        onPageChange={pagination?.onPageChange ?? table.setPageIndex}
        onPageSizeChange={pagination?.onPageSizeChange ?? (pagination ? undefined : table.setPageSize)}
        label={label ?? 'table items'}
      />}
    </div>
  )
}
