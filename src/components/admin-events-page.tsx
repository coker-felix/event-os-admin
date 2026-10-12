import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import { AppDatePicker } from '@/components/ui/date-picker'
import { AppIconAction } from '@/components/ui/app-icon-action'
import { AppPagination } from '@/components/ui/app-pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatDate } from '@/lib/date-format'
import { listAdminOrganizations, type AdminOrganization } from '@/services/admin-account-directory'
import {
  createAdminEvent, createAdminTicketType, deleteAdminTicketType, getAdminEvent, listAdminEventOrders, listAdminEvents, listAdminTicketTypes, publishAdminEvent, updateAdminEvent, updateAdminTicketType,
  type AdminEvent, type AdminEventInput, type AdminOrder, type AdminTicketType, type AdminTicketTypeInput,
} from '@/services/admin-events-ticketing'

const eventsKey = ['qk-admin-events'] as const
const orgsKey = ['qk-admin-organizations'] as const
type EventStatusFilter = '' | 'draft' | 'published' | 'cancelled' | 'completed'

function eventKey(id: string) { return [...eventsKey, 'detail', id] as const }
function ticketKey(id: string) { return [...eventsKey, id, 'ticket-types'] as const }
function ordersKey(id: string, offset: number) { return [...eventsKey, id, 'orders', offset] as const }

function eventDateParts(seconds?: number | string | null) {
  const timestamp = Number(seconds)
  if (seconds === null || seconds === undefined || !Number.isFinite(timestamp) || timestamp <= 0) return { date: null, time: '' }
  const date = new Date(timestamp * 1000)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}` }
}

function toUnixSeconds(date: string | null, time: string) {
  if (!date || !time) return null
  const parsed = new Date(`${date}T${time}:00`)
  return Number.isFinite(parsed.getTime()) ? Math.floor(parsed.getTime() / 1000) : null
}

function displayDateTime(seconds?: number | string | null, timezone?: string | null) {
  const timestamp = Number(seconds)
  if (seconds === null || seconds === undefined || !Number.isFinite(timestamp) || timestamp <= 0) return 'Date unavailable'
  try {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone || undefined }).format(timestamp * 1000)
  } catch {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp * 1000)
  }
}

function statusBadge(status?: string | null) {
  if (status === 'published' || status === 'completed') return <Badge className="bg-success-soft text-success">{status}</Badge>
  if (status === 'cancelled') return <Badge className="bg-danger-soft text-danger">Cancelled</Badge>
  if (status === 'draft') return <Badge className="bg-warning-soft text-warning">Draft</Badge>
  return <Badge variant="outline">{status || 'Unknown'}</Badge>
}

function formatMinor(minor?: number | string | null, currency?: string | null) {
  if (minor === null || minor === undefined || (typeof minor === 'number' && (!Number.isFinite(minor) || !Number.isInteger(minor)))) return '—'
  const code = currency?.trim().toUpperCase() || 'XXX'
  let scale = 2
  try { scale = new Intl.NumberFormat('en', { style: 'currency', currency: code }).resolvedOptions().maximumFractionDigits ?? 2 } catch { /* fallback scale */ }
  let value: bigint
  try { value = BigInt(minor) } catch { return '—' }
  const negative = value < 0n
  const absolute = negative ? -value : value
  const divisor = 10n ** BigInt(scale)
  const whole = absolute / divisor
  const fraction = scale ? `.${String(absolute % divisor).padStart(scale, '0')}` : ''
  const grouped = new Intl.NumberFormat('en', { maximumFractionDigits: 0 }).format(whole)
  return `${code} ${negative ? '-' : ''}${grouped}${fraction}`
}

function ErrorMessage({ children }: { children: string }) {
  return <p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">{children}</p>
}

function EventForm({
  event, organizations, onClose, onSaved, inSheet = false,
}: { event?: AdminEvent | null; organizations: AdminOrganization[]; onClose: () => void; onSaved: (event: AdminEvent) => void; inSheet?: boolean }) {
  const { session } = useAuth()
  const [orgId, setOrgId] = useState(event?.orgId || '')
  const [title, setTitle] = useState(event?.title || '')
  const [description, setDescription] = useState(event?.description || '')
  const [venueId, setVenueId] = useState(event?.venueId || '')
  const start = eventDateParts(event?.startsAt)
  const end = eventDateParts(event?.endsAt)
  const [startsOn, setStartsOn] = useState<string | null>(start.date)
  const [startsTime, setStartsTime] = useState(start.time)
  const [endsOn, setEndsOn] = useState<string | null>(end.date)
  const [endsTime, setEndsTime] = useState(end.time)
  const [timezone, setTimezone] = useState(event?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
  const [attendanceType, setAttendanceType] = useState(event?.attendanceType || 'in_person')
  const [countryCode, setCountryCode] = useState(event?.countryCode || '')
  const [subdivisionCode, setSubdivisionCode] = useState(event?.subdivisionCode || '')
  const [tags, setTags] = useState((event?.tags ?? []).filter((tag): tag is string => Boolean(tag)).join(', '))
  const [categoryId, setCategoryId] = useState(event?.categoryId ? String(event.categoryId) : '')
  const [slug, setSlug] = useState(event?.customSlug || '')
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (input: AdminEventInput) => event
      ? updateAdminEvent(session!.token, event.id, input)
      : createAdminEvent(session!.token, orgId, input),
    onSuccess: async (saved) => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: eventsKey }), queryClient.invalidateQueries({ queryKey: eventKey(saved.id) })])
      onSaved(saved)
    },
  })
  function submit(e: FormEvent) {
    e.preventDefault()
    const startsAt = toUnixSeconds(startsOn, startsTime)
    const endsAt = toUnixSeconds(endsOn, endsTime)
    if (startsAt === null || endsAt === null || endsAt <= startsAt) return
    mutation.mutate({
      title: title.trim(), startsAt, endsAt,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(venueId.trim() ? { venueId: venueId.trim() } : {}),
      ...(categoryId ? { categoryId: Number(categoryId) } : {}),
      ...(attendanceType ? { attendanceType } : {}),
      ...(countryCode.trim() ? { countryCode: countryCode.trim().toUpperCase() } : {}),
      ...(subdivisionCode.trim() ? { subdivisionCode: subdivisionCode.trim().toUpperCase() } : {}),
      ...(timezone.trim() ? { timezone: timezone.trim() } : {}),
      ...(slug.trim() ? { customSlug: slug.trim() } : {}),
      ...(tags.trim() ? { tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean) } : {}),
    })
  }
  const startsAt = toUnixSeconds(startsOn, startsTime)
  const endsAt = toUnixSeconds(endsOn, endsTime)
  return <form className={inSheet ? 'space-y-4 px-6 pb-6' : 'space-y-4'} onSubmit={submit}>
    {!event && <label className="block space-y-1.5 text-sm font-medium">Organization ID<Input list="event-organization-options" value={orgId} onChange={(e) => setOrgId(e.target.value)} required placeholder="Select or enter organization ID" /><datalist id="event-organization-options">{organizations.map((org) => <option key={org.id} value={org.id}>{org.name || org.id}{org.status ? ` · ${org.status}` : ''}</option>)}</datalist></label>}
    <label className="block space-y-1.5 text-sm font-medium">Event title<Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={180} /></label>
    <label className="block space-y-1.5 text-sm font-medium">Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand" /></label>
    <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1.5 text-sm font-medium">Starts on<div><AppDatePicker value={startsOn} onValueChange={setStartsOn} /></div></label><label className="block space-y-1.5 text-sm font-medium">Start time<input type="time" value={startsTime} onChange={(e) => setStartsTime(e.target.value)} required className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand" /></label></div>
    <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1.5 text-sm font-medium">Ends on<div><AppDatePicker value={endsOn} onValueChange={setEndsOn} /></div></label><label className="block space-y-1.5 text-sm font-medium">End time<input type="time" value={endsTime} onChange={(e) => setEndsTime(e.target.value)} required className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand" /></label></div>
    {startsOn && <p className="text-xs text-ink-muted">Starts {formatDate(startsOn)}{startsTime ? ` at ${startsTime}` : ''}; event timestamps are saved using this browser’s timezone.</p>}
    <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1.5 text-sm font-medium">Venue ID <span className="font-normal text-ink-muted">(optional)</span><Input value={venueId} onChange={(e) => setVenueId(e.target.value)} /></label><label className="block space-y-1.5 text-sm font-medium">Timezone<Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Africa/Accra" /></label></div>
    <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1.5 text-sm font-medium">Attendance<select value={attendanceType} onChange={(e) => setAttendanceType(e.target.value)} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand"><option value="in_person">In person</option><option value="virtual">Virtual</option><option value="hybrid">Hybrid</option></select></label><label className="block space-y-1.5 text-sm font-medium">Country code <span className="font-normal text-ink-muted">(optional)</span><Input value={countryCode} onChange={(e) => setCountryCode(e.target.value)} maxLength={2} placeholder="GH" /></label></div>
    <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1.5 text-sm font-medium">Subdivision code <span className="font-normal text-ink-muted">(optional)</span><Input value={subdivisionCode} onChange={(e) => setSubdivisionCode(e.target.value)} placeholder="GH-AA" /></label><label className="block space-y-1.5 text-sm font-medium">Tags <span className="font-normal text-ink-muted">(comma separated)</span><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="music, festival" /></label></div>
    <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1.5 text-sm font-medium">Category ID <span className="font-normal text-ink-muted">(optional)</span><Input inputMode="numeric" value={categoryId} onChange={(e) => setCategoryId(e.target.value.replace(/\D/g, ''))} /></label><label className="block space-y-1.5 text-sm font-medium">Custom slug <span className="font-normal text-ink-muted">(optional)</span><Input value={slug} onChange={(e) => setSlug(e.target.value)} /></label></div>
    {mutation.isError && <ErrorMessage>{mutation.error.message}</ErrorMessage>}
    {startsAt !== null && endsAt !== null && endsAt <= startsAt && <ErrorMessage>Event end must be after the start.</ErrorMessage>}
    <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={mutation.isPending || !title.trim() || !orgId && !event || startsAt === null || endsAt === null || endsAt <= startsAt}>{mutation.isPending ? 'Saving…' : event ? 'Save event' : 'Create draft'}</Button></DialogFooter>
  </form>
}

function TicketTypeEditor({ eventId, ticket, currency, onDone }: { eventId: string; ticket?: AdminTicketType | null; currency?: string | null; onDone: () => void }) {
  const { session } = useAuth()
  const client = useQueryClient()
  const [name, setName] = useState(ticket?.name || '')
  const [price, setPrice] = useState(ticket?.priceMinor === null || ticket?.priceMinor === undefined ? '' : String(ticket.priceMinor))
  const [total, setTotal] = useState(ticket?.total === null || ticket?.total === undefined ? '' : String(ticket.total))
  const saleStart = eventDateParts(ticket?.saleStartAt)
  const saleEnd = eventDateParts(ticket?.saleEndAt)
  const [saleStartsOn, setSaleStartsOn] = useState<string | null>(saleStart.date)
  const [saleStartsTime, setSaleStartsTime] = useState(saleStart.time)
  const [saleEndsOn, setSaleEndsOn] = useState<string | null>(saleEnd.date)
  const [saleEndsTime, setSaleEndsTime] = useState(saleEnd.time)
  const [ticketStatus, setTicketStatus] = useState(ticket?.status || '')
  const mutation = useMutation({
    mutationFn: () => {
      const saleStartAt = toUnixSeconds(saleStartsOn, saleStartsTime)
      const saleEndAt = toUnixSeconds(saleEndsOn, saleEndsTime)
      const input: AdminTicketTypeInput = {
        name: name.trim(), priceMinor: Number(price), total: Number(total),
        ...(saleStartAt !== null ? { saleStartAt } : {}), ...(saleEndAt !== null ? { saleEndAt } : {}),
        ...(ticketStatus ? { status: ticketStatus } : {}),
      }
      return ticket ? updateAdminTicketType(session!.token, eventId, ticket.id, input) : createAdminTicketType(session!.token, eventId, input)
    },
    onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ticketKey(eventId) }), client.invalidateQueries({ queryKey: eventKey(eventId) })]); onDone() },
  })
  return <Sheet open onOpenChange={(open) => { if (!open) onDone() }}><SheetContent className="w-full overflow-y-auto sm:max-w-lg">
    <SheetHeader><SheetTitle>{ticket ? 'Edit ticket type' : 'Add ticket type'}</SheetTitle><SheetDescription>Set ticket inventory, price, and sales window for this event.</SheetDescription></SheetHeader>
    <form id="ticket-type-editor" className="flex-1 space-y-4 overflow-y-auto px-6 pb-6" onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
      <label className="block space-y-1.5 text-sm font-medium">Ticket type name<Input required value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="block space-y-1.5 text-sm font-medium">Price ({currency || 'event currency'} minor units)<Input type="number" min="0" step="1" required value={price} onChange={(e) => setPrice(e.target.value)} /></label>
      <label className="block space-y-1.5 text-sm font-medium">Quantity<Input type="number" min={Number(ticket?.sold ?? 0)} step="1" required value={total} onChange={(e) => setTotal(e.target.value)} /></label>
      <label className="block space-y-1.5 text-sm font-medium">Sales start date<div><AppDatePicker value={saleStartsOn} onValueChange={setSaleStartsOn} placeholder="No start limit" /></div></label>
      <label className="block space-y-1.5 text-sm font-medium">Sales start time <span className="font-normal text-ink-muted">(optional)</span><input type="time" value={saleStartsTime} onChange={(e) => setSaleStartsTime(e.target.value)} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand" /></label>
      <label className="block space-y-1.5 text-sm font-medium">Sales end date<div><AppDatePicker value={saleEndsOn} onValueChange={setSaleEndsOn} placeholder="No end limit" /></div></label>
      <label className="block space-y-1.5 text-sm font-medium">Sales end time <span className="font-normal text-ink-muted">(optional)</span><input type="time" value={saleEndsTime} onChange={(e) => setSaleEndsTime(e.target.value)} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand" /></label>
      {ticket && <label className="block space-y-1.5 text-sm font-medium">Status<Input value={ticketStatus} onChange={(e) => setTicketStatus(e.target.value)} placeholder="Enter API status" /></label>}
      {mutation.isError && <ErrorMessage>{mutation.error.message}</ErrorMessage>}
    </form>
    <SheetFooter className="border-t border-line"><Button variant="outline" onClick={onDone}>Cancel</Button><Button type="submit" form="ticket-type-editor" disabled={mutation.isPending || !name.trim() || !price || !total}>{mutation.isPending ? 'Saving…' : ticket ? 'Save ticket type' : 'Add ticket type'}</Button></SheetFooter>
  </SheetContent></Sheet>
}

function EventDetails({ eventId, onClose, onEventChanged }: { eventId: string | null; onClose: () => void; onEventChanged: () => void }) {
  const { session } = useAuth()
  const client = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [ticketEditor, setTicketEditor] = useState<AdminTicketType | null | undefined>(undefined)
  const [ticketPage, setTicketPage] = useState(0)
  const [ticketPageSize, setTicketPageSize] = useState(10)
  const [ordersPage, setOrdersPage] = useState(0)
  const [orderPageSize, setOrderPageSize] = useState(25)
  const detailsQuery = useQuery({ queryKey: eventKey(eventId || ''), queryFn: () => getAdminEvent(session!.token, eventId!), enabled: Boolean(session?.token && eventId) })
  const ticketsQuery = useQuery({ queryKey: ticketKey(eventId || ''), queryFn: () => listAdminTicketTypes(session!.token, eventId!), enabled: Boolean(session?.token && eventId) })
  const ordersQuery = useQuery({ queryKey: ordersKey(eventId || '', ordersPage * orderPageSize), queryFn: () => listAdminEventOrders(session!.token, eventId!, orderPageSize, ordersPage * orderPageSize), enabled: Boolean(session?.token && eventId) })
  const publish = useMutation({ mutationFn: () => publishAdminEvent(session!.token, eventId!), onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: eventsKey }), client.invalidateQueries({ queryKey: eventKey(eventId || '') })]); onEventChanged() } })
  const removeTicket = useMutation({ mutationFn: (id: string) => deleteAdminTicketType(session!.token, eventId!, id), onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ticketKey(eventId || '') }), client.invalidateQueries({ queryKey: eventKey(eventId || '') })]) } })
  const event = detailsQuery.data?.event
  const tickets = ticketsQuery.data?.ticketTypes ?? (Array.isArray(detailsQuery.data?.ticketTypes) ? detailsQuery.data.ticketTypes.filter((ticket): ticket is AdminTicketType => Boolean(ticket?.id)) : [])
  const ticketPageCount = Math.max(1, Math.ceil(tickets.length / ticketPageSize))
  const visibleTickets = tickets.slice(ticketPage * ticketPageSize, (ticketPage + 1) * ticketPageSize)
  const orders = ordersQuery.data?.orders ?? []
  return <Dialog open={Boolean(eventId)} onOpenChange={(open) => { if (!open) onClose() }}><DialogContent className="max-h-[min(92vh,900px)] overflow-y-auto sm:max-w-5xl">
    <DialogHeader><DialogTitle>{event?.title || 'Event workspace'}</DialogTitle><DialogDescription>Review and manage event details, ticket types, publication, and orders.</DialogDescription></DialogHeader>
    {detailsQuery.isLoading ? <p className="py-8 text-center text-sm text-ink-muted">Loading event…</p> : detailsQuery.isError ? <ErrorMessage>{detailsQuery.error.message}</ErrorMessage> : event ? <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-muted p-4"><div className="flex flex-wrap items-center gap-3">{statusBadge(event.status)}<span className="text-sm text-ink-muted">Organization {event.orgId || 'unavailable'}</span></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { setEditing((value) => !value); setTicketEditor(undefined) }}>{editing ? 'Close editor' : 'Edit event'}</Button>{event.status === 'draft' && <Button disabled={publish.isPending} onClick={() => publish.mutate()}>{publish.isPending ? 'Publishing…' : 'Publish event'}</Button>}</div></div>
      {publish.isError && <ErrorMessage>{publish.error.message}</ErrorMessage>}
      {editing ? <Card><CardHeader><CardTitle>Edit event</CardTitle></CardHeader><CardContent><EventForm event={event} organizations={[]} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); onEventChanged() }} /></CardContent></Card> : <Card><CardHeader><CardTitle>Event details</CardTitle></CardHeader><CardContent><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><div><dt className="text-xs text-ink-muted">Starts</dt><dd className="mt-1 text-sm">{displayDateTime(event.startsAt, event.timezone)}</dd></div><div><dt className="text-xs text-ink-muted">Ends</dt><dd className="mt-1 text-sm">{displayDateTime(event.endsAt, event.timezone)}</dd></div><div><dt className="text-xs text-ink-muted">Venue ID</dt><dd className="mt-1 break-all text-sm">{event.venueId || 'Not provided'}</dd></div><div><dt className="text-xs text-ink-muted">Attendance</dt><dd className="mt-1 text-sm">{event.attendanceType || 'Not provided'}</dd></div><div><dt className="text-xs text-ink-muted">Currency</dt><dd className="mt-1 text-sm">{event.currency || 'Not provided'}</dd></div><div><dt className="text-xs text-ink-muted">Visibility</dt><dd className="mt-1 text-sm">{event.visibility || 'Not provided'}</dd></div><div><dt className="text-xs text-ink-muted">Category ID</dt><dd className="mt-1 text-sm">{event.categoryId ?? 'Not provided'}</dd></div><div><dt className="text-xs text-ink-muted">Country</dt><dd className="mt-1 text-sm">{event.countryCode || 'Not provided'}</dd></div><div><dt className="text-xs text-ink-muted">Slug</dt><dd className="mt-1 break-all text-sm">{event.customSlug || 'Not provided'}</dd></div></dl>{event.description && <p className="mt-5 whitespace-pre-wrap border-t border-line pt-4 text-sm leading-6 text-ink-muted">{event.description}</p>}</CardContent></Card>}
      <Card><CardHeader className="border-b border-line sm:grid-cols-[1fr_auto] sm:items-center"><div><CardTitle>Ticket types</CardTitle><p data-slot="card-description" className="text-sm text-ink-muted">Manage admission options and inventory for this event.</p></div>{ticketEditor === undefined && <Button onClick={() => setTicketEditor(null)}>Add ticket type</Button>}</CardHeader><CardContent className="p-0">{ticketsQuery.isLoading ? <p className="px-5 py-8 text-center text-sm text-ink-muted">Loading ticket types…</p> : ticketsQuery.isError ? <div className="m-5"><ErrorMessage>{ticketsQuery.error.message}</ErrorMessage></div> : <div className="overflow-x-auto"><Table aria-label="Event ticket types"><TableHeader><TableRow><TableHead>Ticket type</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Sold / total</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{visibleTickets.length ? visibleTickets.map((ticket) => <TableRow key={ticket.id}><TableCell><span className="font-medium">{ticket.name || 'Unnamed ticket type'}</span><span className="mt-0.5 block text-xs text-ink-muted">{ticket.id}</span></TableCell><TableCell className="text-right tabular-nums">{formatMinor(ticket.priceMinor, event.currency)}</TableCell><TableCell className="text-right tabular-nums">{ticket.sold ?? 0} / {ticket.total ?? '—'}</TableCell><TableCell>{ticket.status || 'Unknown'}</TableCell><TableCell className="text-right"><div className="flex justify-end gap-1"><AppIconAction label={`Edit ${ticket.name || 'ticket type'}`} icon={<span aria-hidden="true">✎</span>} onClick={() => setTicketEditor(ticket)} /><AppIconAction label={`Delete ${ticket.name || 'ticket type'}`} icon={<span aria-hidden="true">×</span>} disabled={removeTicket.isPending || Number(ticket.sold ?? 0) > 0} onClick={() => { if (window.confirm('Delete this unsold ticket type?')) removeTicket.mutate(ticket.id) }} /></div></TableCell></TableRow>) : <TableRow><TableCell colSpan={5} className="h-28 text-center text-sm text-ink-muted">No ticket types yet. Add a ticket type before publishing.</TableCell></TableRow>}</TableBody></Table></div>}{removeTicket.isError && <div className="px-5 py-3"><ErrorMessage>{removeTicket.error.message}</ErrorMessage></div>}<AppPagination pageIndex={ticketPage} pageSize={ticketPageSize} totalItems={tickets.length} onPageChange={(next) => setTicketPage(Math.min(next, ticketPageCount - 1))} onPageSizeChange={(size) => { setTicketPageSize(size); setTicketPage(0) }} label="ticket types" /></CardContent></Card>
      {ticketEditor !== undefined && <TicketTypeEditor key={ticketEditor?.id || 'new-ticket'} eventId={event.id} ticket={ticketEditor} currency={event.currency} onDone={() => { setTicketEditor(undefined); setTicketPage(0) }} />}
      <Card><CardHeader className="border-b border-line"><div><CardTitle>Orders</CardTitle><p data-slot="card-description" className="text-sm text-ink-muted">Event orders returned newest first.</p></div></CardHeader><CardContent className="p-0">{ordersQuery.isLoading ? <p className="px-5 py-8 text-center text-sm text-ink-muted">Loading orders…</p> : ordersQuery.isError ? <div className="m-5"><ErrorMessage>{ordersQuery.error.message}</ErrorMessage></div> : <div className="overflow-x-auto"><Table aria-label="Event orders"><TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Buyer contact</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{orders.length ? orders.map((order) => <OrderRow key={order.id} order={order} />) : <TableRow><TableCell colSpan={4} className="h-28 text-center text-sm text-ink-muted">No orders for this event yet.</TableCell></TableRow>}</TableBody></Table></div>}<AppPagination pageIndex={ordersPage} pageSize={orderPageSize} totalItems={ordersQuery.data?.total ?? 0} onPageChange={setOrdersPage} onPageSizeChange={(size) => { setOrderPageSize(size); setOrdersPage(0) }} label="event orders" /></CardContent></Card>
    </div> : <p className="py-8 text-center text-sm text-ink-muted">No event details were returned.</p>}
    <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
  </DialogContent></Dialog>
}

function OrderRow({ order }: { order: AdminOrder }) {
  const created = order.createdAt ? displayDateTime(order.createdAt) : 'Date unavailable'
  const buyer = order.contactEmail || order.contactPhone || order.userId || 'Buyer details unavailable'
  return <TableRow><TableCell><span className="block font-medium">{order.id}</span><span className="mt-0.5 block text-xs text-ink-muted">{created}</span></TableCell><TableCell className="break-all">{buyer}</TableCell><TableCell>{statusBadge(order.status)}</TableCell><TableCell className="text-right tabular-nums">{formatMinor(order.total, order.currency)}</TableCell></TableRow>
}

export function AdminEventsPage() {
  const { session } = useAuth()
  const client = useQueryClient()
  const [status, setStatus] = useState<EventStatusFilter>('')
  const [orgId, setOrgId] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [eventPageSize, setEventPageSize] = useState(10)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const orgsQuery = useQuery({ queryKey: orgsKey, queryFn: () => listAdminOrganizations(session!.token), enabled: Boolean(session?.token) })
  const eventsQuery = useQuery({ queryKey: [...eventsKey, 'list', orgId, status], queryFn: () => listAdminEvents(session!.token, { ...(orgId ? { orgId } : {}), ...(status ? { status } : {}) }), enabled: Boolean(session?.token) })
  const events = eventsQuery.data?.events ?? []
  const filtered = useMemo(() => events.filter((event) => `${event.title ?? ''} ${event.id} ${event.orgId ?? ''} ${event.venueId ?? ''}`.toLowerCase().includes(search.trim().toLowerCase())), [events, search])
  const pageCount = Math.max(1, Math.ceil(filtered.length / eventPageSize))
  const visible = filtered.slice(page * eventPageSize, (page + 1) * eventPageSize)
  const organizations = orgsQuery.data?.organizations ?? []
  return <section className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Events</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Event management</h1><p className="mt-2 max-w-2xl text-sm text-ink-muted">Manage cross-organization event details, ticket types, publishing, and orders.</p></div><Button onClick={() => setCreateOpen(true)}>Create event</Button></div>
    <Card><CardHeader className="border-b border-line sm:grid-cols-[1fr_auto_auto_auto] sm:items-center"><div><CardTitle>Events</CardTitle><p data-slot="card-description" className="text-sm text-ink-muted">{filtered.length} matching events</p></div><Input aria-label="Search events" placeholder="Search title, event or organization ID" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0) }} className="sm:w-64" /><label className="sr-only" htmlFor="event-status-filter">Filter events by status</label><select id="event-status-filter" value={status} onChange={(e) => { setStatus(e.target.value as EventStatusFilter); setPage(0) }} className="h-9 rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand"><option value="">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="cancelled">Cancelled</option><option value="completed">Completed</option></select><label className="sr-only" htmlFor="event-org-filter">Filter events by organization</label><select id="event-org-filter" value={orgId} onChange={(e) => { setOrgId(e.target.value); setPage(0) }} className="h-9 rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand"><option value="">All organizations</option>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name || org.id}</option>)}</select></CardHeader><CardContent className="p-0">
      {orgsQuery.isError && <div className="px-5 pt-4"><ErrorMessage>{orgsQuery.error.message}</ErrorMessage></div>}{eventsQuery.isLoading ? <p className="px-6 py-10 text-center text-sm text-ink-muted">Loading events…</p> : eventsQuery.isError ? <div className="m-5"><ErrorMessage>{eventsQuery.error.message}</ErrorMessage></div> : <div className="overflow-x-auto"><Table aria-label="Admin events"><TableHeader><TableRow><TableHead>Event</TableHead><TableHead>Organization</TableHead><TableHead>Starts</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Details</TableHead></TableRow></TableHeader><TableBody>{visible.length ? visible.map((event) => <TableRow key={event.id}><TableCell><span className="block font-medium">{event.title || 'Untitled event'}</span><span className="mt-0.5 block text-xs text-ink-muted">{event.id}</span></TableCell><TableCell>{organizations.find((org) => org.id === event.orgId)?.name || event.orgId || 'Organization unavailable'}</TableCell><TableCell>{displayDateTime(event.startsAt, event.timezone)}</TableCell><TableCell>{statusBadge(event.status)}</TableCell><TableCell className="text-right"><div className="flex justify-end"><AppIconAction label={`Manage ${event.title || 'event'}`} icon={<span aria-hidden="true">↗</span>} showLabel onClick={() => setSelectedEventId(event.id)} /></div></TableCell></TableRow>) : <TableRow><TableCell colSpan={5} className="h-32 text-center">{search ? <p className="text-sm text-ink-muted">No events match “{search}”.</p> : <div><p className="text-sm font-medium">No events found</p><p className="mt-1 text-sm text-ink-muted">Create an event or adjust the organization and status filters.</p></div>}</TableCell></TableRow>}</TableBody></Table></div>}
      <AppPagination pageIndex={page} pageSize={eventPageSize} totalItems={filtered.length} onPageChange={(next) => setPage(Math.min(next, pageCount - 1))} onPageSizeChange={(size) => { setEventPageSize(size); setPage(0) }} label="events" />
    </CardContent></Card>
    <Sheet open={createOpen} onOpenChange={setCreateOpen}><SheetContent className="w-full overflow-y-auto sm:max-w-2xl"><SheetHeader><SheetTitle>Create event</SheetTitle><SheetDescription>New events start as drafts. Add ticket types and publish them from the event workspace.</SheetDescription></SheetHeader><EventForm inSheet organizations={organizations} onClose={() => setCreateOpen(false)} onSaved={(event) => { setCreateOpen(false); setSelectedEventId(event.id); client.invalidateQueries({ queryKey: eventsKey }) }} /></SheetContent></Sheet>
    <EventDetails key={selectedEventId || 'no-event'} eventId={selectedEventId} onClose={() => setSelectedEventId(null)} onEventChanged={() => client.invalidateQueries({ queryKey: eventsKey })} />
  </section>
}
