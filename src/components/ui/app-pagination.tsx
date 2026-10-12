import { Button } from '@/components/ui/button'

export interface AppPaginationProps {
  pageIndex: number
  pageSize: number
  totalItems: number
  onPageChange: (pageIndex: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: readonly number[]
  label?: string
}

export function AppPagination({
  pageIndex,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  label = 'items',
}: AppPaginationProps) {
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize))
  const firstItem = totalItems === 0 ? 0 : pageIndex * pageSize + 1
  const lastItem = Math.min(totalItems, (pageIndex + 1) * pageSize)

  return (
    <nav aria-label={`${label} pagination`} className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
      <p aria-live="polite" className="text-xs text-ink-muted">
        Showing <span className="font-medium text-ink">{firstItem} to {lastItem}</span> of <span className="font-medium text-ink">{totalItems}</span>
      </p>
      <div className="flex items-center gap-4">
        {onPageSizeChange && (
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            Rows
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="h-8 rounded-lg border border-line bg-surface px-2 text-xs text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
            >
              {pageSizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
        )}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" disabled={pageIndex <= 0} onClick={() => onPageChange(Math.max(0, pageIndex - 1))}>
            Previous
          </Button>
          <span className="text-xs text-ink-muted">Page {pageCount === 0 ? 0 : pageIndex + 1} of {pageCount}</span>
          <Button variant="outline" size="sm" disabled={pageIndex + 1 >= pageCount} onClick={() => onPageChange(Math.min(pageCount - 1, pageIndex + 1))}>
            Next
          </Button>
        </div>
      </div>
    </nav>
  )
}
