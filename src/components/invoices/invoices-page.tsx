import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { TableCell, TableRow } from '@/components/ui/table'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { FilterTabs } from '@/components/ui/filter-tabs'
import { formatDate } from '@/lib/date-format'
import { formatMoney } from '@/lib/money-format'
import { getAdminInvoice, listAdminInvoices, type AdminInvoice } from '@/services/admin-documents'

const PAGE_SIZE = 25
const invoiceKey = ['qk-admin-invoices'] as const
const statuses = ['draft', 'issued', 'paid', 'overdue', 'voided', 'refunded'] as const

function display(value?: string | null) { return value?.trim() || '—' }
function statusClass(status?: string | null) {
  if (status === 'paid') return 'bg-success-soft text-success'
  if (status === 'overdue' || status === 'refunded') return 'bg-warning-soft text-warning'
  if (status === 'voided') return 'bg-surface-muted text-ink-muted'
  if (status === 'issued') return 'bg-brand-soft text-brand'
  return 'bg-surface-muted text-ink-muted'
}

export function InvoicesPage() {
  const { session } = useAuth()
  const [pageIndex, setPageIndex] = useState(0)
  const [status, setStatus] = useState('')
  const [targetType, setTargetType] = useState('')
  const [targetId, setTargetId] = useState('')
  const [selected, setSelected] = useState<AdminInvoice | null>(null)
  const [pageTokens, setPageTokens] = useState<string[]>([''])
  const pageToken = pageTokens[pageIndex] || ''
  const query = useQuery({
    queryKey: [...invoiceKey, pageIndex, pageToken, status, targetType, targetId],
    queryFn: () => listAdminInvoices(session!.token, { pageSize: PAGE_SIZE, pageToken: pageToken || undefined, status: status || undefined, targetType: targetType || undefined, targetId: targetId.trim() || undefined }),
    enabled: Boolean(session?.token),
  })
  const invoices = (query.data?.invoices ?? []).filter((item): item is AdminInvoice => Boolean(item))
  const nextToken = query.data?.nextPageToken || ''
  const pageCount = Math.max(1, pageIndex + (nextToken ? 2 : 1))

  function reset(filters: { status?: string; targetType?: string; targetId?: string }) {
    if (filters.status !== undefined) setStatus(filters.status)
    if (filters.targetType !== undefined) setTargetType(filters.targetType)
    if (filters.targetId !== undefined) setTargetId(filters.targetId)
    setPageIndex(0)
    setPageTokens([''])
  }
  function nextPage() {
    if (!nextToken) return
    setPageTokens((tokens) => [...tokens.slice(0, pageIndex + 1), nextToken])
    setPageIndex((index) => index + 1)
  }

  return <section className="space-y-6">
    <div><h1 className="text-xl font-semibold tracking-tight">Invoices</h1><p className="mt-1 max-w-2xl text-sm text-ink-muted">Review invoices for vendor and venue bookings. Invoice changes are managed through booking and payment workflows.</p></div>
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">Status<select value={status} onChange={(event) => reset({ status: event.target.value })} className="h-9 rounded-lg border border-line bg-surface px-3 text-sm text-ink"><option value="">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <FilterTabs label="Filter invoices by provider" value={targetType} onValueChange={(value) => reset({ targetType: value })} options={[{ value: '', label: 'All providers' }, { value: 'vendor', label: 'Vendors' }, { value: 'venue', label: 'Venues' }]} />
      <label className="sr-only" htmlFor="invoice-provider-id">Filter by provider ID</label><input id="invoice-provider-id" value={targetId} onChange={(event) => reset({ targetId: event.target.value })} placeholder="Provider ID" className="h-9 w-48 rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-brand" />
    </div>

    <Card className="gap-0 py-0"><CardContent className="p-0">
      <DataTable data={invoices} headers={['Invoice', 'Provider', 'Booking', 'Event', { label: 'Amount', className: 'text-right' }, 'Status', 'Created']} label="Invoices" loading={query.isLoading} loadingMessage="Loading invoices…" error={query.isError ? query.error.message : null} emptyMessage={status || targetType || targetId ? 'No invoices match these filters.' : 'No invoices found.'} pagination={false} renderRow={(invoice) => <TableRow key={invoice.id || `${invoice.bookingId}-${invoice.createdAt}`} className="cursor-pointer" onClick={() => setSelected(invoice)}>
        <TableCell><span className="block font-medium">Invoice</span><span className="mt-0.5 block max-w-52 truncate text-xs text-ink-muted">{display(invoice.id)}</span></TableCell><TableCell><Badge variant="outline">{display(invoice.targetType)}</Badge><span className="mt-1 block max-w-40 truncate text-xs text-ink-muted">{display(invoice.targetId)}</span></TableCell><TableCell><span className="block">{display(invoice.bookingId)}</span><span className="mt-0.5 block text-xs text-ink-muted">{display(invoice.bookingStatus)}</span></TableCell><TableCell>{display(invoice.eventId)}</TableCell><TableCell className="text-right tabular-nums">{invoice.amountMinor == null || !invoice.currency ? '—' : safeMoney(invoice.amountMinor, invoice.currency)}</TableCell><TableCell><Badge className={statusClass(invoice.status)}>{display(invoice.status)}</Badge>{invoice.payoutHeld && <span className="mt-1 block text-xs text-warning">Payout held</span>}</TableCell><TableCell>{formatDate(invoice.createdAt?.slice(0, 10))}</TableCell>
      </TableRow>} containerClassName="" />
      <div className="flex items-center justify-between gap-3 border-t border-line pt-4"><p aria-live="polite" className="text-xs text-ink-muted">Showing {invoices.length ? pageIndex * PAGE_SIZE + 1 : 0} to {pageIndex * PAGE_SIZE + invoices.length} invoices{nextToken ? ' · more available' : ''}</p><div className="flex items-center gap-2"><button type="button" className="rounded-lg border border-line px-3 py-1.5 text-xs disabled:opacity-50" onClick={() => setPageIndex((index) => Math.max(0, index - 1))} disabled={pageIndex === 0}>Previous</button><span className="text-xs text-ink-muted">Page {pageIndex + 1} of {pageCount}</span><button type="button" className="rounded-lg border border-line px-3 py-1.5 text-xs disabled:opacity-50" onClick={nextPage} disabled={!nextToken}>Next</button></div></div>
      </CardContent></Card>
    <InvoiceDetailsSheet invoice={selected} open={Boolean(selected?.id)} onOpenChange={(open) => { if (!open) setSelected(null) }} />
  </section>
}

function safeMoney(amount: number | string, currency: string) {
  try { return formatMoney(String(amount), currency) } catch { return `${currency.toUpperCase()} ${String(amount)}` }
}

function InvoiceDetailsSheet({ invoice, open, onOpenChange }: { invoice: AdminInvoice | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { session } = useAuth()
  const invoiceId = invoice?.id || ''
  const query = useQuery({ queryKey: [...invoiceKey, 'detail', invoiceId], queryFn: () => getAdminInvoice(session!.token, invoiceId), enabled: Boolean(open && session?.token && invoiceId) })
  const details = query.data ?? invoice
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className="w-full overflow-y-auto sm:max-w-xl"><SheetHeader><SheetTitle>Invoice details</SheetTitle><SheetDescription>{display(details?.id)}</SheetDescription></SheetHeader>
    <div className="space-y-6 px-6 pb-8">{query.isLoading ? <p className="py-8 text-center text-sm text-ink-muted">Loading invoice…</p> : query.isError ? <p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">{query.error.message}</p> : details && <>
      <section><h3 className="text-sm font-semibold">Invoice</h3><dl className="mt-3 grid grid-cols-2 gap-4 text-sm"><Detail label="Status"><Badge className={statusClass(details.status)}>{display(details.status)}</Badge></Detail><Detail label="Amount">{details.amountMinor == null || !details.currency ? '—' : safeMoney(details.amountMinor, details.currency)}</Detail><Detail label="Provider">{display(details.targetType)} · {display(details.targetId)}</Detail><Detail label="Payout held">{details.payoutHeld == null ? '—' : details.payoutHeld ? 'Yes' : 'No'}</Detail><Detail label="Created">{formatDate(details.createdAt?.slice(0, 10))}</Detail></dl></section>
      <section><h3 className="text-sm font-semibold">Booking context</h3><dl className="mt-3 grid grid-cols-2 gap-4 text-sm"><Detail label="Booking">{display(details.bookingId)}</Detail><Detail label="Booking status">{display(details.bookingStatus)}</Detail><Detail label="Event">{display(details.eventId)}</Detail><Detail label="Requesting organization">{display(details.requesterOrgId)}</Detail><Detail label="Contract">{display(details.contractId)}</Detail></dl></section>
    </>}</div>
  </SheetContent></Sheet>
}

function Detail({ label, children }: { label: string; children: ReactNode }) { return <div className="min-w-0"><dt className="text-xs text-ink-muted">{label}</dt><dd className="mt-1 break-words">{children}</dd></div> }
