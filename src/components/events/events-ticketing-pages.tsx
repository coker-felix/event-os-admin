import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import { AppIconAction } from '@/components/ui/app-icon-action'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { TableCell, TableRow } from '@/components/ui/table'
import { getPublicEvent, listPublishedEvents, verifyTicket, type PublicEvent, type PublicTicketType } from '@/services/admin-events-ticketing'

const eventsKey = ['qk-admin-public-events'] as const

function formatEventDateTime(value: PublicEvent['startsAt'], timezone?: string | null) {
  if (value === null || value === undefined || value === '') return 'Date unavailable'
  const seconds = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(seconds) || seconds <= 0) return 'Date unavailable'
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit',
      timeZone: timezone || 'UTC', timeZoneName: 'short',
    }).format(new Date(seconds * 1000))
  } catch {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' }).format(new Date(seconds * 1000))
  }
}

function monogram(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || '?'
}

function EventDetailsDialog({ event, onClose }: { event: PublicEvent | null; onClose: () => void }) {
  const { session } = useAuth()
  const query = useQuery({
    queryKey: [...eventsKey, 'detail', event?.id],
    queryFn: () => getPublicEvent(session!.token, event!.id),
    enabled: Boolean(session?.token && event),
  })
  const details = query.data
  const ticketTypes = Array.isArray(details?.ticketTypes) ? details.ticketTypes.filter((ticket): ticket is PublicTicketType => Boolean(ticket && ticket.id)) : []
  return <Dialog open={Boolean(event)} onOpenChange={(open) => { if (!open) onClose() }}><DialogContent className="max-h-[min(85vh,720px)] overflow-y-auto sm:max-w-2xl">
    <DialogHeader><DialogTitle>{details?.event?.title || event?.title || 'Event details'}</DialogTitle><DialogDescription>Published event information and public ticket availability.</DialogDescription></DialogHeader>
    {query.isLoading ? <p className="py-5 text-sm text-ink-muted">Loading event details…</p> : query.isError ? <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{query.error.message}</p> : details?.event ? <div className="space-y-5">
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2"><div><dt className="text-xs text-ink-muted">Starts</dt><dd className="mt-1 text-sm">{formatEventDateTime(details.event.startsAt, details.event.timezone)}</dd></div><div><dt className="text-xs text-ink-muted">Ends</dt><dd className="mt-1 text-sm">{formatEventDateTime(details.event.endsAt, details.event.timezone)}</dd></div><div><dt className="text-xs text-ink-muted">Venue</dt><dd className="mt-1 break-all text-sm">{details.event.venueId || (details.event.attendanceType === 'virtual' ? 'Virtual event' : 'Not provided')}</dd></div><div><dt className="text-xs text-ink-muted">Attendance</dt><dd className="mt-1 text-sm">{details.event.attendanceType || 'Not provided'}</dd></div></dl>
      {details.event.description && <p className="whitespace-pre-wrap text-sm leading-6 text-ink-muted">{details.event.description}</p>}
      <div><h3 className="text-sm font-semibold">Public ticket types</h3>{ticketTypes.length ? <DataTable data={ticketTypes} headers={['Ticket type', 'Admission', { label: 'Available', className: 'text-right' }]} label="Public ticket availability" pagination={false} containerClassName="mt-2" renderRow={(ticket) => <TableRow key={ticket.id}><TableCell>{ticket.name || 'Unnamed ticket type'}</TableCell><TableCell>{ticket.supplyKind || '—'}{ticket.admissionsPerUnit && ticket.admissionsPerUnit !== '1' && ticket.admissionsPerUnit !== 1 ? ` · ${ticket.admissionsPerUnit} admissions` : ''}</TableCell><TableCell className="text-right">{ticket.available ?? '—'}</TableCell></TableRow>} /> : <p className="mt-2 rounded-lg bg-surface-muted px-3 py-3 text-sm text-ink-muted">No public ticket types are available for this event.</p>}</div>
    </div> : <p className="py-5 text-sm text-ink-muted">No public event details were returned.</p>}
    <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
  </DialogContent></Dialog>
}

export function EventsDirectoryPage() {
  const { session } = useAuth()
  const query = useQuery({ queryKey: eventsKey, queryFn: () => listPublishedEvents(session!.token), enabled: Boolean(session?.token) })
  const [search, setSearch] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [selectedEvent, setSelectedEvent] = useState<PublicEvent | null>(null)
  const events = query.data?.events ?? []
  const filtered = useMemo(() => events.filter((event) => `${event.title ?? ''} ${event.category ?? ''} ${event.countryCode ?? ''} ${event.venueId ?? ''}`.toLowerCase().includes(search.trim().toLowerCase())), [events, search])
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visibleEvents = filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
  return <section className="space-y-6">
    <div><h1 className="text-xl font-semibold tracking-tight">Published events</h1><p className="mt-1 max-w-2xl text-sm text-ink-muted">Review public event listings and the ticket availability buyers can see.</p></div>
    <div role="note" className="rounded-card border border-brand/15 bg-brand-soft/50 px-4 py-3 text-sm leading-6 text-ink-muted">This directory contains published public events. Drafts and private events require organization access, which is not granted by an admin session.</div>
    <div className="flex justify-end"><Input aria-label="Search events" placeholder="Search title, category, venue" value={search} onChange={(event) => { setSearch(event.target.value); setPageIndex(0) }} className="sm:w-72" /></div>
    <Card><CardContent className="p-0"><DataTable data={visibleEvents} headers={['Event', 'Starts', 'Location', 'Visibility', { label: 'Details', className: 'text-right' }]} label="Published events" loading={query.isLoading} loadingMessage="Loading published events…" error={query.isError ? query.error.message : null} emptyMessage={search ? `No events match “${search}”. Try another search.` : <div><p className="text-sm font-medium">No published events yet</p><p className="mt-1 text-sm text-ink-muted">Public events will appear here when organizers publish them.</p></div>} emptyClassName="h-32 text-center" pagination={{ pageIndex, pageSize, totalItems: filtered.length, onPageChange: (index) => setPageIndex(Math.min(index, pageCount - 1)), onPageSizeChange: (size) => { setPageSize(size); setPageIndex(0) } }} renderRow={(item) => <TableRow key={item.id}><TableCell><div className="flex items-center gap-3"><span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">{monogram(item.title || 'Event')}</span><div className="min-w-0"><p className="truncate font-medium">{item.title || 'Untitled event'}</p><p className="mt-0.5 truncate text-xs text-ink-muted">{item.category || item.attendanceType || 'Event'}</p></div></div></TableCell><TableCell>{formatEventDateTime(item.startsAt, item.timezone)}</TableCell><TableCell>{item.venueId || (item.attendanceType === 'virtual' ? 'Virtual' : '—')}</TableCell><TableCell><Badge className="bg-success-soft text-success">Public</Badge></TableCell><TableCell className="text-right"><div className="flex justify-end"><AppIconAction label={`View ${item.title || 'event'}`} icon={<span aria-hidden="true">↗</span>} onClick={() => setSelectedEvent(item)} /></div></TableCell></TableRow>} containerClassName="" />
    </CardContent></Card>
    <EventDetailsDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} />
  </section>
}

function reasonText(reason?: string | null) {
  const labels: Record<string, string> = {
    already_entered: 'Ticket has already been checked in',
    not_paid: 'Ticket has not been paid',
    cancelled: 'Ticket was cancelled',
    unknown_code: 'Ticket code was not found',
    wrong_event: 'Ticket belongs to another event',
    event_unpublished: 'Event is not published',
  }
  return reason ? labels[reason] || reason.replaceAll('_', ' ') : 'Ticket is valid'
}

export function TicketVerificationPage() {
  const { session } = useAuth()
  const eventsQuery = useQuery({ queryKey: eventsKey, queryFn: () => listPublishedEvents(session!.token), enabled: Boolean(session?.token) })
  const events = eventsQuery.data?.events ?? []
  const [eventId, setEventId] = useState('')
  const [code, setCode] = useState('')
  const verify = useMutation({ mutationFn: () => verifyTicket(session!.token, eventId.trim(), code.trim()) })
  function submit(event: FormEvent) { event.preventDefault(); verify.mutate() }
  const result = verify.data
  return <section className="space-y-6">
    <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Ticketing</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Verify a ticket</h1><p className="mt-1 max-w-2xl text-sm text-ink-muted">Check whether a ticket code is valid for an event.</p></div>
    <div role="note" className="rounded-card border border-brand/15 bg-brand-soft/50 px-4 py-3 text-sm leading-6 text-ink-muted">Verification is read-only. It does not check the ticket in. Use the organization check-in flow to record entry.</div>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
      <Card><CardHeader><CardTitle>Ticket code</CardTitle><p data-slot="card-description" className="text-sm text-ink-muted">Choose a published event or enter an event ID.</p></CardHeader><CardContent>
        {eventsQuery.isError && <p role="status" className="mb-4 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">Published event suggestions couldn’t be loaded. You can still enter an event ID.</p>}
        <form className="space-y-4" onSubmit={submit}>
          <label className="block space-y-1.5 text-sm font-medium" htmlFor="ticket-event-id">Event<input id="ticket-event-id" list="published-event-options" value={eventId} onChange={(event) => setEventId(event.target.value)} required placeholder={eventsQuery.isLoading ? 'Loading event options…' : 'Select or enter event ID'} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/30" /><datalist id="published-event-options">{events.map((item) => <option key={item.id} value={item.id}>{item.title || 'Untitled event'}</option>)}</datalist></label>
          <label className="block space-y-1.5 text-sm font-medium" htmlFor="ticket-code">Ticket code<Input id="ticket-code" value={code} onChange={(event) => setCode(event.target.value)} required autoComplete="off" placeholder="Scan or enter ticket code" /></label>
          {verify.isError && <p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">{verify.error.message}</p>}
          <Button type="submit" disabled={verify.isPending || !eventId.trim() || !code.trim()}>{verify.isPending ? 'Checking…' : 'Verify ticket'}</Button>
        </form>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Verification result</CardTitle></CardHeader><CardContent>
        {verify.isPending ? <p aria-live="polite" className="text-sm text-ink-muted">Checking ticket…</p> : verify.isSuccess && !result ? <p role="status" className="text-sm text-ink-muted">The verification service returned no result.</p> : result ? <div role="status" className="space-y-4">
          <div className="flex items-center gap-3">{result.valid ? <Badge className="bg-success-soft text-success">Valid ticket</Badge> : <Badge className="bg-danger-soft text-danger">Invalid ticket</Badge>}<span className="text-sm text-ink-muted">{reasonText(result.reason)}</span></div>
          {result.event?.title && <p className="text-sm"><span className="text-ink-muted">Event: </span>{result.event.title}</p>}
          {result.ticketType?.name && <p className="text-sm"><span className="text-ink-muted">Ticket type: </span>{result.ticketType.name}</p>}
          {result.checkedIn === true && <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">This ticket has already been checked in.</p>}
        </div> : <p className="text-sm text-ink-muted">A ticket result will appear here after verification.</p>}
      </CardContent></Card>
    </div>
  </section>
}
