import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { ArrowRight, CalendarCheck, ChartLineUp, CurrencyDollar, TrendUp, UsersThree, type Icon } from '@phosphor-icons/react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

const statusBadgeClass: Record<EventSummary['status'], string> = {
  Live: 'bg-success-soft text-success',
  Draft: 'bg-warning-soft text-warning',
  Completed: 'bg-brand-soft text-brand',
}

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
      return <Badge className={statusBadgeClass[status]}>{status}</Badge>
    },
  },
  { accessorKey: 'attendees', header: 'Attendees', cell: ({ getValue }) => <span className="tabular-nums">{getValue<string>()}</span> },
]

type OverviewMetric = { value: string; change: string; trend: number[] }
type Overview = { events: OverviewMetric; attendees: OverviewMetric; revenue: OverviewMetric; conversion: OverviewMetric }

async function getOverview(): Promise<Overview> {
  // Replace this local fixture with the admin API query when the backend is connected.
  return {
    events: { value: '24', change: '+12.5%', trend: [14, 16, 15, 18, 20, 19, 24] },
    attendees: { value: '8,492', change: '+8.2%', trend: [5200, 5800, 6100, 6900, 7400, 7900, 8492] },
    revenue: { value: formatMoney('12458000', 'USD'), change: '+14.3%', trend: [7200, 8100, 8600, 9400, 10800, 11600, 12458] },
    conversion: { value: '6.8%', change: '+2.1%', trend: [4.9, 5.2, 5.6, 5.8, 6.1, 6.4, 6.8] },
  }
}

export function DashboardPage() {
  const overview = useQuery({ queryKey: ['admin', 'overview'], queryFn: getOverview })
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Overview</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Good morning, Alex</h1>
        <p className="mt-2 text-sm text-ink-muted">
          <time dateTime="2025-03-17">{formatDate('2025-03-17')}</time>
          <span className="mx-1.5 text-line">·</span>Here's what's happening across your events.
        </p>
      </div>

      <section aria-label="Overview metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total events" icon={CalendarCheck} metric={overview.data?.events} isLoading={overview.isLoading} isError={overview.isError} />
        <MetricCard label="Total attendees" icon={UsersThree} metric={overview.data?.attendees} isLoading={overview.isLoading} isError={overview.isError} />
        <MetricCard label="Gross revenue" icon={CurrencyDollar} metric={overview.data?.revenue} isLoading={overview.isLoading} isError={overview.isError} featured />
        <MetricCard label="Conversion rate" icon={ChartLineUp} metric={overview.data?.conversion} isLoading={overview.isLoading} isError={overview.isError} />
      </section>

      <Card>
        <CardHeader className="border-b border-line">
          <CardTitle>Recent events</CardTitle>
          <p className="text-xs text-ink-muted">A snapshot of your latest activity</p>
          <CardAction>
            <Link to="/app/events" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-ink-muted hover:bg-surface-muted hover:text-ink">
              View all events <ArrowRight size={14} weight="bold" aria-hidden="true" />
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable columns={columns} data={eventRows} label="Recent events" emptyMessage={<div className="px-6 py-10"><p className="text-sm font-medium text-ink">No events yet</p><p className="mt-1 text-sm text-ink-muted">Events you create will show up here.</p></div>} containerClassName="" tableClassName="min-w-[560px] text-left" headerRowClassName="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted" rowClassName="text-[13px] text-ink-muted transition-colors hover:bg-surface-muted/60" />
        </CardContent>
      </Card>
      <p className="text-center text-[11px] text-ink-muted">Overview data is sample content. Connect the admin API to load live metrics.</p>
    </div>
  )
}

function MetricCard({ label, icon: MetricIcon, metric, isLoading, isError, featured }: {
  label: string
  icon: Icon
  metric?: OverviewMetric
  isLoading: boolean
  isError: boolean
  featured?: boolean
}) {
  const sparkId = `spark-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <Card className={`gap-4 py-5 ${featured ? 'bg-brand text-white' : ''}`}>
      <CardHeader className="px-5">
        <div className="flex items-start justify-between">
          <p className={`text-xs font-medium ${featured ? 'text-white/70' : 'text-ink-muted'}`}>{label}</p>
          <span aria-hidden="true" className={`grid size-9 shrink-0 place-items-center rounded-xl ${featured ? 'bg-white/15 text-white' : 'bg-brand-soft text-brand'}`}>
            <MetricIcon size={18} weight="bold" />
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-5">
        {isError ? (
          <p className={`text-sm ${featured ? 'text-white' : 'text-danger'}`}>Couldn't load this metric.</p>
        ) : (
          <>
            <p className="min-h-9 text-[30px] font-semibold tracking-[-0.03em]">
              {isLoading || !metric ? <span className={`inline-block h-8 w-24 animate-pulse rounded ${featured ? 'bg-white/15' : 'bg-surface-muted'}`} /> : metric.value}
            </p>
            <div className="mt-3 flex items-center justify-between gap-3">
              {isLoading || !metric ? (
                <span className={`inline-block h-5 w-20 animate-pulse rounded-full ${featured ? 'bg-white/15' : 'bg-surface-muted'}`} />
              ) : (
                <Badge className={featured ? 'gap-1 bg-white/15 text-white' : 'gap-1 bg-success-soft text-success'}>
                  <TrendUp size={12} weight="bold" aria-hidden="true" />{metric.change}
                </Badge>
              )}
              {!isLoading && metric && (
                <div className="h-9 flex-1" aria-hidden="true">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metric.trend.map((value) => ({ value }))} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                      <defs>
                        <linearGradient id={sparkId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={featured ? '#ffffff' : 'var(--color-brand)'} stopOpacity={featured ? 0.45 : 0.35} />
                          <stop offset="100%" stopColor={featured ? '#ffffff' : 'var(--color-brand)'} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke={featured ? '#ffffff' : 'var(--color-brand)'} strokeWidth={1.75} fill={`url(#${sparkId})`} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <p className={`mt-1.5 text-[11px] ${featured ? 'text-white/70' : 'text-ink-muted'}`}>vs. last month</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
