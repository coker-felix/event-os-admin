import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import { getModuleOverview, type AnalyticsModule, type ModuleOverview } from '@/services/admin-analytics'
import { formatMoney } from '@/lib/money-format'
import { formatDate } from '@/lib/date-format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const statusStyles: Record<string, string> = {
  current: 'bg-success-soft text-success', stale: 'bg-warning-soft text-warning',
  partial: 'bg-warning-soft text-warning', never_received: 'bg-surface-muted text-ink-muted',
  missing: 'bg-surface-muted text-ink-muted',
}
const palette = ['var(--color-brand)', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#0ea5e9']

function displayValue(value: number | null | undefined, unit?: string | null, currency?: string | null) {
  if (value == null || !Number.isFinite(value)) return 'Not available'
  if (currency) {
    if (!Number.isInteger(value)) return 'Not available'
    try { return formatMoney(String(value), currency) } catch { return `${currency} ${value.toLocaleString()}` }
  }
  const formatted = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)
  if (unit === 'percent' || unit === 'percentage' || unit === '%') return `${formatted}%`
  return unit ? `${formatted} ${unit}` : formatted
}

function niceLabel(value?: string | null) {
  return (value ?? '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Metric'
}

function OverviewChart({ chart }: { chart: NonNullable<NonNullable<ModuleOverview['charts']>[number]> }) {
  const series = (chart.series ?? []).filter((item) => item != null)
  const categoryData = new Map<string, Record<string, string | number | null>>()
  const timeData = new Map<string, Record<string, string | number | null>>()
  for (const item of series) {
    const key = item.key || item.label || 'value'
    for (const point of (item.categoryPoints ?? []).filter((value) => value != null)) {
      const identity = point.categoryKey || point.categoryLabel || 'Unknown'
      const row = categoryData.get(identity) ?? { name: point.categoryLabel || identity }
      row[key] = point.value ?? null
      categoryData.set(identity, row)
    }
    for (const point of (item.timePoints ?? []).filter((value) => value != null)) {
      const identity = point.timestamp ?? ''
      const row = timeData.get(identity) ?? { timestamp: identity ? formatDate(identity.slice(0, 10)) : 'Unknown' }
      row[key] = point.value ?? null
      timeData.set(identity, row)
    }
  }
  const points = [...categoryData.values()]
  const data = points.length ? points : [...timeData.values()]
  const keys = series.map((item) => item.key || item.label || 'value')
  return <Card>
    <CardHeader><CardTitle>{chart.title || niceLabel(chart.id)}</CardTitle></CardHeader>
    <CardContent>
      {!data.length ? <p className="py-8 text-center text-sm text-ink-muted">No chart data for this period.</p> : <div className="h-64 w-full" role="img" aria-label={chart.title || 'Analytics chart'}>
        <ResponsiveContainer width="100%" height="100%">
          {chart.chartType === 'donut' ? <PieChart><Tooltip formatter={(value) => displayValue(typeof value === 'number' ? value : null, chart.unit)} /><Pie data={data.map((point) => ({ name: point.name, value: Object.values(point).find((value) => typeof value === 'number') ?? 0 }))} dataKey="value" nameKey="name" innerRadius={58} outerRadius={90} paddingAngle={2}>{data.map((_, index) => <Cell key={index} fill={palette[index % palette.length]} />)}</Pie></PieChart>
            : chart.chartType === 'bar' ? <BarChart data={data}><CartesianGrid vertical={false} stroke="var(--color-line)" /><XAxis dataKey={points.length ? 'name' : 'timestamp'} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><Tooltip formatter={(value) => displayValue(typeof value === 'number' ? value : null, chart.unit)} />{keys.map((key, index) => <Bar key={key} dataKey={key} fill={palette[index % palette.length]} radius={[4, 4, 0, 0]} />)}</BarChart>
              : <AreaChart data={data}><defs>{keys.map((key, index) => <linearGradient key={key} id={`${chart.id || 'chart'}-${index}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={palette[index % palette.length]} stopOpacity={0.25} /><stop offset="100%" stopColor={palette[index % palette.length]} stopOpacity={0} /></linearGradient>)}</defs><CartesianGrid vertical={false} stroke="var(--color-line)" /><XAxis dataKey={points.length ? 'name' : 'timestamp'} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><Tooltip formatter={(value) => displayValue(typeof value === 'number' ? value : null, chart.unit)} />{keys.map((key, index) => <Area key={key} type="monotone" dataKey={key} stroke={palette[index % palette.length]} fill={`url(#${chart.id || 'chart'}-${index})`} connectNulls={false} />)}</AreaChart>}
        </ResponsiveContainer>
      </div>}
      {series.length > 1 && <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">{series.map((item, index) => <span key={item.key || index}><span className="mr-1.5 inline-block size-2 rounded-full" style={{ backgroundColor: palette[index % palette.length] }} />{item.label || niceLabel(item.key)}</span>)}</p>}
    </CardContent>
  </Card>
}

export function ModuleAnalyticsOverview({ module, title }: { module: AnalyticsModule; title: string }) {
  const { session } = useAuth()
  const overview = useQuery({ queryKey: ['admin', 'analytics', module, 'overview'], queryFn: () => getModuleOverview(session!.token, module), enabled: Boolean(session?.token) })
  const result = overview.data
  const metrics = (result?.metrics ?? []).filter((metric) => metric != null)
  const charts = (result?.charts ?? []).filter((chart) => chart != null)
  const freshness = result?.freshnessStatus ?? 'never_received'
  return <section className="space-y-6">
    <div><h1 className="text-2xl font-semibold tracking-tight">{title} overview</h1><p className="mt-2 max-w-2xl text-sm text-ink-muted">Aggregate activity and performance for this module.</p></div>
    {overview.isError && <Card><CardContent className="py-5"><p className="text-sm font-medium text-danger">Couldn't load {title.toLowerCase()} analytics.</p><p className="mt-1 text-sm text-ink-muted">{overview.error instanceof Error ? overview.error.message : 'Please try again.'}</p><button className="mt-3 text-sm font-medium text-brand underline" onClick={() => void overview.refetch()}>Try again</button></CardContent></Card>}
    {!overview.isError && <>
      <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
        <span>Data status</span><Badge className={statusStyles[freshness] ?? statusStyles.never_received}>{niceLabel(freshness)}</Badge>
        {result?.from && result?.to && <span>· {formatDate(result.from.slice(0, 10))} to {formatDate(result.to.slice(0, 10))}</span>}
        {result?.granularity && <span>· {niceLabel(result.granularity)} intervals</span>}
      </div>
      {overview.isLoading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((index) => <Card key={index}><CardContent className="py-8"><span className="block h-7 w-32 animate-pulse rounded bg-surface-muted" /></CardContent></Card>)}</div>
        : freshness === 'never_received' && metrics.length === 0 && charts.length === 0 ? <Card><CardHeader><CardTitle>Analytics are not available yet</CardTitle></CardHeader><CardContent><p className="text-sm text-ink-muted">No source snapshots cover this period. Metrics and charts will appear after data is received.</p></CardContent></Card>
          : <>
            {metrics.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric, index) => <Card key={metric.key || index}><CardHeader><p className="text-sm font-medium text-ink-muted">{metric.label || niceLabel(metric.key)}</p></CardHeader><CardContent><p className="text-2xl font-semibold tracking-tight">{displayValue(metric.value, metric.unit, metric.currency)}</p>{metric.numerator != null && metric.denominator != null && <p className="mt-1 text-xs text-ink-muted">{displayValue(metric.numerator)} of {displayValue(metric.denominator)}</p>}</CardContent></Card>)}</div> : <Card><CardContent className="py-6"><p className="text-sm text-ink-muted">No metrics are available for this period.</p></CardContent></Card>}
            {charts.length ? <div className="grid gap-4 xl:grid-cols-2">{charts.map((chart, index) => <OverviewChart key={chart.id || index} chart={chart} />)}</div> : <Card><CardContent className="py-6"><p className="text-sm text-ink-muted">No chart data is available for this period.</p></CardContent></Card>}
          </>}
      {result?.sources?.length ? <Card><CardHeader><CardTitle>Data sources</CardTitle></CardHeader><CardContent className="space-y-3">{result.sources.filter((source) => source != null).map((source, index) => <div key={`${source.service || 'source'}-${index}`} className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3 last:border-0 last:pb-0"><span className="text-sm font-medium">{source.service || 'Unknown source'}</span><span className="flex items-center gap-2 text-xs text-ink-muted"><Badge className={statusStyles[source.status ?? ''] ?? statusStyles.never_received}>{niceLabel(source.status)}</Badge>{source.updatedAt ? <time dateTime={source.updatedAt}>{formatDate(source.updatedAt.slice(0, 10))}</time> : 'No snapshot received'}</span></div>)}</CardContent></Card> : null}
    </>}
  </section>
}
