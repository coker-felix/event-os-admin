import { useQuery } from '@tanstack/react-query'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { AppPagination } from '@/components/ui/app-pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/date-format'
import { formatMoney } from '@/lib/money-format'

type EventSummary = {
  name: string
  date: string
  status: 'Live' | 'Draft' | 'Completed'
  attendees: string
}

const eventRows: EventSummary[] = [
  { name: 'Product Summit 2025', date: '2025-03-18', status: 'Live', attendees: '1,284' },
  { name: 'Design Systems Meetup', date: '2025-03-22', status: 'Draft', attendees: '—' },
  { name: 'Founders & Builders', date: '2025-03-14', status: 'Completed', attendees: '846' },
]

const columns: ColumnDef<EventSummary>[] = [
  {
    accessorKey: 'name',
    header: 'Event',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-xs font-semibold text-brand">
          {row.original.name.slice(0, 1)}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium text-ink">{row.original.name}</span>
          <time dateTime={row.original.date} className="mt-0.5 block text-xs text-ink-muted">
            {formatDate(row.original.date)}
          </time>
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => {
      const status = getValue<EventSummary['status']>()
      const styles = {
        Live: 'bg-success-soft text-success',
        Draft: 'bg-warning-soft text-warning',
        Completed: 'bg-brand-soft text-brand',
      }
      return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[status]}`}>{status}</span>
    },
  },
  { accessorKey: 'attendees', header: 'Attendees', cell: ({ getValue }) => <span className="tabular-nums">{getValue<string>()}</span> },
]

async function getOverview() {
  // Replace this local fixture with the admin API query when the backend is connected.
  return { events: 24, attendees: '8,492', conversion: '6.8%' }
}

export function DashboardPage() {
  const overview = useQuery({ queryKey: ['admin', 'overview'], queryFn: getOverview })
  const table = useReactTable({
    data: eventRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10, pageIndex: 0 } },
  })

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-medium text-ink-muted">
            <time dateTime="2025-03-17">{formatDate('2025-03-17')}</time>
          </p>
          <h1 className="text-[26px] font-semibold tracking-[-0.035em]">Good morning, Alex <span aria-hidden="true">✦</span></h1>
          <p className="mt-1 text-sm text-ink-muted">Here’s what’s happening across your events.</p>
        </div>
      </div>

      <section aria-label="Overview metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total events" value={overview.data?.events.toString()} change="＋ 12.5%" detail="vs. last month" icon="▦" />
        <MetricCard label="Total attendees" value={overview.data?.attendees} change="＋ 8.2%" detail="vs. last month" icon="♧" />
        <MetricCard label="Gross revenue" value={formatMoney('12458000', 'USD')} change="＋ 14.3%" detail="vs. last month" icon="$" />
        <MetricCard label="Conversion rate" value={overview.data?.conversion} change="＋ 2.1%" detail="vs. last month" icon="↗" />
      </section>

      <section className="rounded-card border border-line bg-surface shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-6 py-5">
          <div><h2 className="text-sm font-semibold">Recent events</h2><p className="mt-1 text-xs text-ink-muted">A snapshot of your latest activity</p></div>
          <Link to="/app/events" className="rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-ink-muted hover:bg-surface-muted">View all events <span aria-hidden="true">→</span></Link>
        </div>
        <Table className="min-w-[560px] text-left">
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                {group.headers.map((header) => <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="text-[13px] text-ink-muted">
                {row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <AppPagination
          pageIndex={table.getState().pagination.pageIndex}
          pageSize={table.getState().pagination.pageSize}
          totalItems={table.getPrePaginationRowModel().rows.length}
          onPageChange={table.setPageIndex}
          label="events"
        />
      </section>
      <p className="text-center text-[11px] text-ink-muted">Overview data is sample content. Connect the admin API to load live metrics.</p>
    </div>
  )
}

function MetricCard({ label, value, change, detail, icon }: { label: string; value?: string; change: string; detail: string; icon: string }) {
  return <article className="rounded-card border border-line bg-surface p-5 shadow-card"><div className="flex items-start justify-between"><p className="text-xs font-medium text-ink-muted">{label}</p><span aria-hidden="true" className="grid size-8 place-items-center rounded-lg bg-brand-soft text-sm font-semibold text-brand">{icon}</span></div><p className="mt-4 min-h-8 text-[25px] font-semibold tracking-[-0.03em]">{value ?? <span className="text-ink-muted">…</span>}</p><p className="mt-2 text-[11px]"><span className="font-semibold text-success">{change}</span><span className="ml-1.5 text-ink-muted">{detail}</span></p></article>
}
