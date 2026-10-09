import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'

type EventSummary = {
  name: string
  date: string
  status: 'Live' | 'Draft' | 'Completed'
  attendees: string
}

const eventRows: EventSummary[] = [
  { name: 'Product Summit 2025', date: 'Mar 18, 2025', status: 'Live', attendees: '1,284' },
  { name: 'Design Systems Meetup', date: 'Mar 22, 2025', status: 'Draft', attendees: '—' },
  { name: 'Founders & Builders', date: 'Mar 14, 2025', status: 'Completed', attendees: '846' },
]

const columns: ColumnDef<EventSummary>[] = [
  { accessorKey: 'name', header: 'Event' },
  { accessorKey: 'date', header: 'Date' },
  {
    accessorKey: 'status', header: 'Status',
    cell: ({ getValue }) => {
      const status = getValue<EventSummary['status']>()
      const styles = { Live: 'bg-success-soft text-success', Draft: 'bg-warning-soft text-warning', Completed: 'bg-surface-muted text-ink-muted' }
      return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[status]}`}>{status}</span>
    },
  },
  { accessorKey: 'attendees', header: 'Attendees', cell: ({ getValue }) => <span className="tabular-nums">{getValue<string>()}</span> },
]

async function getOverview() {
  // Replace this local fixture with the admin API query when the backend is connected.
  return { events: 24, attendees: '8,492', revenue: '$124,580', conversion: '6.8%' }
}

export function DashboardPage() {
  const overview = useQuery({ queryKey: ['admin', 'overview'], queryFn: getOverview })
  const table = useReactTable({ data: eventRows, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-xs font-medium text-ink-muted">Monday, March 17, 2025</p><h1 className="text-[26px] font-semibold tracking-[-0.035em]">Good morning, Alex <span aria-hidden="true">✦</span></h1><p className="mt-1 text-sm text-ink-muted">Here’s what’s happening across your events.</p></div>
        <button className="rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-strong">＋ Create event</button>
      </div>

      <section aria-label="Overview metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total events" value={overview.data?.events.toString()} change="＋ 12.5%" detail="vs. last month" icon="▦" />
        <MetricCard label="Total attendees" value={overview.data?.attendees} change="＋ 8.2%" detail="vs. last month" icon="♧" />
        <MetricCard label="Gross revenue" value={overview.data?.revenue} change="＋ 14.3%" detail="vs. last month" icon="$" />
        <MetricCard label="Conversion rate" value={overview.data?.conversion} change="＋ 2.1%" detail="vs. last month" icon="↗" />
      </section>

      <section className="rounded-card border border-line bg-surface shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-6 py-5"><div><h2 className="text-sm font-semibold">Recent events</h2><p className="mt-1 text-xs text-ink-muted">A snapshot of your latest activity</p></div><button className="rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-ink-muted hover:bg-surface-muted">View all events <span aria-hidden="true">→</span></button></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left"><thead><tr className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">{table.getHeaderGroups().map((group) => group.headers.map((header) => <th key={header.id} className="px-6 py-3.5">{flexRender(header.column.columnDef.header, header.getContext())}</th>))}</tr></thead><tbody className="divide-y divide-line">{table.getRowModel().rows.map((row) => <tr key={row.id} className="text-[13px] hover:bg-canvas/60">{row.getVisibleCells().map((cell, index) => <td key={cell.id} className={`px-6 py-4 ${index === 0 ? 'font-medium text-ink' : 'text-ink-muted'}`}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody></table></div>
        <div className="flex items-center justify-between border-t border-line px-6 py-4 text-xs text-ink-muted"><span>Showing <strong className="font-semibold text-ink">3</strong> of <strong className="font-semibold text-ink">24</strong> events</span><div className="flex gap-2"><button disabled className="rounded-md border border-line px-2.5 py-1.5 disabled:opacity-40">← Previous</button><button className="rounded-md border border-line px-2.5 py-1.5 hover:bg-surface-muted">Next →</button></div></div>
      </section>
      <p className="text-center text-[11px] text-ink-muted">Overview data is sample content. Connect the admin API to load live metrics.</p>
    </div>
  )
}

function MetricCard({ label, value, change, detail, icon }: { label: string; value?: string; change: string; detail: string; icon: string }) {
  return <article className="rounded-card border border-line bg-surface p-5 shadow-card"><div className="flex items-start justify-between"><p className="text-xs font-medium text-ink-muted">{label}</p><span aria-hidden="true" className="grid size-8 place-items-center rounded-lg bg-brand-soft text-sm font-semibold text-brand">{icon}</span></div><p className="mt-4 min-h-8 text-[25px] font-semibold tracking-[-0.03em]">{value ?? <span className="text-ink-muted">…</span>}</p><p className="mt-2 text-[11px]"><span className="font-semibold text-success">{change}</span><span className="ml-1.5 text-ink-muted">{detail}</span></p></article>
}
