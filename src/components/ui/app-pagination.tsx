import { Button } from '@/components/ui/button'

export interface AppPaginationProps {
  pageIndex: number
  pageSize: number
  totalItems: number
  onPageChange: (pageIndex: number) => void
  label?: string
}

export function AppPagination({
  pageIndex,
  pageSize,
  totalItems,
  onPageChange,
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
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={pageIndex <= 0} onClick={() => onPageChange(Math.max(0, pageIndex - 1))}>
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={pageIndex + 1 >= pageCount} onClick={() => onPageChange(Math.min(pageCount - 1, pageIndex + 1))}>
          Next
        </Button>
      </div>
    </nav>
  )
}
