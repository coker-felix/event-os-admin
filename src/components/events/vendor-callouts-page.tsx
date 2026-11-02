import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth'
import { AppIconAction } from '@/components/ui/app-icon-action'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FilterTabs } from '@/components/ui/filter-tabs'
import { Input } from '@/components/ui/input'
import { TableCell, TableRow } from '@/components/ui/table'
import { listAdminOrganizations } from '@/services/admin-account-directory'
import { cancelAdminVendorCallout, closeAdminVendorCallout, getAdminVendorCallout, listAdminEvents, listAdminVendorCallouts, type AdminVendorCallout } from '@/services/admin-events-ticketing'

const calloutsKey = ['qk-admin-vendor-callouts'] as const
const statusOptions = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
]

function readableDate(value?: string | number | null) {
  if (value == null || value === '') return 'Not provided'
  const number = Number(value)
  if (!Number.isFinite(number)) return 'Not provided'
  const date = new Date(number < 1e12 ? number * 1000 : number)
  return Number.isNaN(date.getTime()) ? 'Not provided' : new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function CalloutStatus({ status }: { status?: string | null }) {
  if (status === 'open') return <Badge className="bg-success-soft text-success">Open</Badge>
  if (status === 'closed') return <Badge className="bg-warning-soft text-warning">Closed</Badge>
  if (status === 'cancelled') return <Badge variant="outline">Cancelled</Badge>
  return <Badge variant="outline">{status || 'Unknown'}</Badge>
}

function CalloutDetails({ calloutId, onClose }: { calloutId: string | null; onClose: () => void }) {
  const { session } = useAuth()
  const query = useQuery({
    queryKey: [...calloutsKey, 'detail', calloutId],
    queryFn: () => getAdminVendorCallout(session!.token, calloutId!),
    enabled: Boolean(session?.token && calloutId),
  })
  const callout = query.data
  return <Dialog open={Boolean(calloutId)} onOpenChange={(open) => { if (!open) onClose() }}>
    <DialogContent className="max-h-[min(85vh,720px)] overflow-y-auto sm:max-w-xl">
      <DialogHeader><DialogTitle>Vendor callout details</DialogTitle><DialogDescription>Review the event, organization, schedule, and requested services.</DialogDescription></DialogHeader>
      {query.isLoading ? <p className="py-5 text-sm text-ink-muted">Loading callout details…</p>
        : query.isError ? <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{query.error.message}</p>
          : !callout ? <p className="py-5 text-sm text-ink-muted">Callout details were not returned.</p>
            : <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <div><dt className="text-xs text-ink-muted">Status</dt><dd className="mt-1"><CalloutStatus status={callout.status} /></dd></div>
              <div><dt className="text-xs text-ink-muted">Category</dt><dd className="mt-1">{callout.category || 'Not provided'}</dd></div>
              <div><dt className="text-xs text-ink-muted">Organization</dt><dd className="mt-1 break-all">{callout.organizationName || callout.organization?.name || callout.orgId || callout.organization?.id || 'Not provided'}</dd></div>
              <div><dt className="text-xs text-ink-muted">Event</dt><dd className="mt-1 break-words">{callout.eventTitle || callout.event?.title || callout.eventId || callout.event?.id || 'Not provided'}</dd></div>
              <div><dt className="text-xs text-ink-muted">Opens</dt><dd className="mt-1">{readableDate(callout.opensAt)}</dd></div>
              <div><dt className="text-xs text-ink-muted">Closes</dt><dd className="mt-1">{readableDate(callout.closesAt)}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-ink-muted">Service types</dt><dd className="mt-1">{(callout.serviceKinds ?? []).filter((kind): kind is string => Boolean(kind?.trim())).join(', ') || 'No service types specified'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-ink-muted">Callout ID</dt><dd className="mt-1 break-all font-mono text-xs">{callout.id || 'Not provided'}</dd></div>
            </dl>}
    </DialogContent>
  </Dialog>
}

export function VendorCalloutsPage() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [orgId, setOrgId] = useState('')
  const [eventId, setEventId] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const organizationsQuery = useQuery({
    queryKey: ['qk-admin-vendor-callout-organizations'],
    queryFn: () => listAdminOrganizations(session!.token, 'organizer'),
    enabled: Boolean(session?.token),
  })
  const eventsQuery = useQuery({
    queryKey: ['qk-admin-vendor-callout-events', orgId],
    queryFn: () => listAdminEvents(session!.token, { orgId }),
    enabled: Boolean(session?.token && orgId),
  })
  const filters = { status, category, orgId, eventId, limit: pageSize, offset: page * pageSize }
  const query = useQuery({
    queryKey: [...calloutsKey, filters],
    queryFn: () => listAdminVendorCallouts(session!.token, filters),
    enabled: Boolean(session?.token),
  })
  const refresh = async (calloutId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: calloutsKey }),
      queryClient.invalidateQueries({ queryKey: [...calloutsKey, 'detail', calloutId] }),
    ])
  }
  const close = useMutation({
    mutationFn: (id: string) => closeAdminVendorCallout(session!.token, id),
    onSuccess: async (_, id) => { toast.success('Callout closed.'); await refresh(id) },
  })
  const cancel = useMutation({
    mutationFn: (id: string) => cancelAdminVendorCallout(session!.token, id),
    onSuccess: async (_, id) => { toast.success('Callout cancelled.'); await refresh(id) },
  })
  const callouts = query.data?.callouts ?? []

  return <section className="space-y-6">
    <div><h1 className="text-xl font-semibold tracking-tight">Vendor callouts</h1><p className="mt-1 max-w-2xl text-sm text-ink-muted">Review callouts across events, inspect their details, and close or cancel listings. Organizers create callouts from their events.</p></div>
    <div className="space-y-3">
      <FilterTabs label="Filter callouts by status" value={status} onValueChange={(value) => { setStatus(value); setPage(0) }} options={statusOptions} />
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-sm font-medium">Category<Input value={category} onChange={(event) => { setCategory(event.target.value); setPage(0) }} placeholder="Filter by category" /></label>
        <label className="block space-y-1.5 text-sm font-medium">Organization<select value={orgId} onChange={(event) => { setOrgId(event.target.value); setEventId(''); setPage(0) }} disabled={organizationsQuery.isLoading || organizationsQuery.isError} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-60"><option value="">{organizationsQuery.isLoading ? 'Loading organizations…' : organizationsQuery.isError ? 'Organizations unavailable' : organizationsQuery.data?.organizations.length ? 'All organizations' : 'No organizations available'}</option>{(organizationsQuery.data?.organizations ?? []).map((organization) => <option key={organization.id} value={organization.id}>{organization.name || organization.id}</option>)}</select></label>
        <label className="block space-y-1.5 text-sm font-medium">Event<select value={eventId} onChange={(event) => { setEventId(event.target.value); setPage(0) }} disabled={!orgId || eventsQuery.isLoading || eventsQuery.isError || !(eventsQuery.data?.events.length)} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-60"><option value="">{!orgId ? 'Choose an organization first' : eventsQuery.isLoading ? 'Loading events…' : eventsQuery.isError ? 'Events unavailable' : eventsQuery.data?.events.length ? 'All events' : 'No events for this organization'}</option>{(eventsQuery.data?.events ?? []).map((event) => <option key={event.id} value={event.id}>{event.title || event.id}</option>)}</select></label>
      </div>
      {organizationsQuery.isError && <p role="alert" className="text-sm text-danger">Could not load organizations: {organizationsQuery.error.message}</p>}
      {orgId && eventsQuery.isError && <p role="alert" className="text-sm text-danger">Could not load events for this organization: {eventsQuery.error.message}</p>}
    </div>
    <Card className="gap-0 py-0"><CardContent className="p-0">
      <DataTable data={callouts} headers={['Callout', 'Organization', 'Event', 'Category', 'Status', { label: 'Actions', className: 'text-right' }]} label="Vendor callouts" loading={query.isLoading} loadingMessage="Loading vendor callouts…" error={query.isError ? query.error.message : null} emptyMessage={category || orgId || eventId || status ? 'No callouts match these filters.' : 'No vendor callouts are available.'} pagination={{ pageIndex: page, pageSize, totalItems: query.data?.total ?? 0, onPageChange: setPage, onPageSizeChange: (size) => { setPageSize(size); setPage(0) } }} renderRow={(callout: AdminVendorCallout) => <TableRow key={callout.id}>
        <TableCell><span className="block font-medium">{callout.category || 'Vendor callout'}</span><span className="mt-0.5 block font-mono text-xs text-ink-muted">{callout.id}</span></TableCell>
        <TableCell>{callout.organizationName || callout.organization?.name || callout.orgId || callout.organization?.id || 'Organization unavailable'}</TableCell>
        <TableCell>{callout.eventTitle || callout.event?.title || callout.eventId || callout.event?.id || 'Event unavailable'}</TableCell>
        <TableCell>{callout.category || 'Not provided'}</TableCell>
        <TableCell><CalloutStatus status={callout.status} /></TableCell>
        <TableCell className="text-right"><div className="flex justify-end gap-1">
          <AppIconAction label={`View callout ${callout.id}`} icon={<span aria-hidden="true">↗</span>} onClick={() => setSelectedId(callout.id)} />
          {callout.status === 'open' && <Button size="sm" variant="outline" disabled={close.isPending || cancel.isPending} onClick={() => close.mutate(callout.id)}>Close</Button>}
          {(callout.status === 'open' || callout.status === 'closed') && <Button size="sm" variant="outline" disabled={close.isPending || cancel.isPending} onClick={() => { if (window.confirm('Cancel this callout? Cancelled callouts cannot be reopened.')) cancel.mutate(callout.id) }}>Cancel</Button>}
        </div></TableCell>
      </TableRow>} containerClassName="" />
      {(close.isError || cancel.isError) && <div className="px-5 py-3"><p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">{close.error?.message || cancel.error?.message}</p></div>}
    </CardContent></Card>
    <CalloutDetails calloutId={selectedId} onClose={() => setSelectedId(null)} />
  </section>
}
