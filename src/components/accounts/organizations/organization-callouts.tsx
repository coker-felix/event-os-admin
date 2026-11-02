import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cancelAdminVendorCallout, closeAdminVendorCallout, createOrganizationVendorCallout, listAdminEvents, listAdminVendorCallouts, updateOrganizationVendorCallout, type AdminVendorCallout } from '@/services/admin-events-ticketing'

const blank = { category: 'general', serviceKinds: 'wristbands', opensAt: '', closesAt: '' }
const toLocal = (seconds?: number | string | null) => seconds ? new Date(Number(seconds) * 1000).toISOString().slice(0, 16) : ''

export function OrganizationCallouts({ organizationId, enabled }: { organizationId: string; enabled: boolean }) {
  const { session } = useAuth()
  const client = useQueryClient()
  const [eventId, setEventId] = useState('')
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState<AdminVendorCallout | null>(null)
  const events = useQuery({ queryKey: ['admin-org-callout-events', organizationId], queryFn: () => listAdminEvents(session!.token, { orgId: organizationId }), enabled: Boolean(session?.token && enabled) })
  const callouts = useQuery({ queryKey: ['admin-org-callouts', organizationId, eventId], queryFn: () => listAdminVendorCallouts(session!.token, { orgId: organizationId, eventId }), enabled: Boolean(session?.token && enabled && eventId) })
  const invalidate = async () => Promise.all([client.invalidateQueries({ queryKey: ['admin-org-callouts', organizationId] }), client.invalidateQueries({ queryKey: ['qk-admin-vendor-callouts'] })])
  const input = () => ({ category: form.category.trim(), serviceKinds: form.serviceKinds.split(',').map((kind) => kind.trim()).filter(Boolean), opensAt: Math.floor(new Date(form.opensAt).getTime() / 1000), closesAt: Math.floor(new Date(form.closesAt).getTime() / 1000) })
  const create = useMutation({ mutationFn: () => createOrganizationVendorCallout(session!.token, organizationId, eventId, input()), onSuccess: async () => { setForm(blank); await invalidate() } })
  const update = useMutation({ mutationFn: () => updateOrganizationVendorCallout(session!.token, organizationId, eventId, editing!.id, input()), onSuccess: async () => { setEditing(null); setForm(blank); await invalidate() } })
  const close = useMutation({ mutationFn: (calloutId: string) => closeAdminVendorCallout(session!.token, calloutId), onSuccess: invalidate })
  const cancel = useMutation({ mutationFn: (calloutId: string) => cancelAdminVendorCallout(session!.token, calloutId), onSuccess: invalidate })
  const selectedEvent = useMemo(() => events.data?.events.find((event) => event.id === eventId), [events.data, eventId])
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (editing) update.mutate(); else create.mutate() }
  return <Card>
    <CardHeader><CardTitle>Organization vendor callouts</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      {!enabled && <p className="text-sm text-ink-muted">Approve KYB and activate the organize capability to manage event callouts.</p>}
      {enabled && <label className="block space-y-1.5 text-sm font-medium">Organization event<select aria-label="Organization event" value={eventId} onChange={(event) => { setEventId(event.target.value); setEditing(null); setForm(blank) }} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"><option value="">Select an event</option>{(events.data?.events ?? []).map((event) => <option key={event.id} value={event.id}>{event.title || event.id}</option>)}</select></label>}
      {events.isLoading && <p className="text-sm text-ink-muted">Loading events…</p>}{events.isError && <p role="alert" className="text-sm text-danger">{events.error.message}</p>}
      {eventId && !events.isError && <>
        {callouts.isLoading && <p className="text-sm text-ink-muted">Loading callouts…</p>}{callouts.isError && <p role="alert" className="text-sm text-danger">{callouts.error.message}</p>}
        {!callouts.isLoading && !callouts.isError && (callouts.data?.callouts ?? []).length === 0 && <p className="text-sm text-ink-muted">No callouts for {selectedEvent?.title || 'this event'}.</p>}
        <div className="space-y-2">{(callouts.data?.callouts ?? []).map((callout) => <article key={callout.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-line p-3"><div><h3 className="font-medium">{callout.category || 'Vendor callout'}</h3><p className="text-xs text-ink-muted">{(callout.serviceKinds ?? []).filter(Boolean).join(', ')} · {callout.status}</p><p className="text-xs text-ink-muted">{toLocal(callout.opensAt)} – {toLocal(callout.closesAt)}</p></div>{callout.status === 'open' && <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => { setEditing(callout); setForm({ category: callout.category || 'general', serviceKinds: (callout.serviceKinds ?? []).filter(Boolean).join(', '), opensAt: toLocal(callout.opensAt), closesAt: toLocal(callout.closesAt) }) }}>Edit</Button><Button type="button" variant="outline" onClick={() => close.mutate(callout.id)}>Close</Button><Button type="button" variant="outline" onClick={() => { if (window.confirm('Cancel this callout?')) cancel.mutate(callout.id) }}>Cancel</Button></div>}</article>)}</div>
        <form className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2" onSubmit={submit}>
          <label className="space-y-1 text-xs font-medium">Category<Input required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label>
          <label className="space-y-1 text-xs font-medium">Service kinds<Input required value={form.serviceKinds} onChange={(event) => setForm({ ...form, serviceKinds: event.target.value })} /></label>
          <label className="space-y-1 text-xs font-medium">Opens at<Input required type="datetime-local" value={form.opensAt} onChange={(event) => setForm({ ...form, opensAt: event.target.value })} /></label>
          <label className="space-y-1 text-xs font-medium">Closes at<Input required type="datetime-local" value={form.closesAt} onChange={(event) => setForm({ ...form, closesAt: event.target.value })} /></label>
          <div className="flex gap-2 sm:col-span-2"><Button type="submit" disabled={!eventId || create.isPending || update.isPending}>{editing ? 'Save callout' : 'Create callout'}</Button>{editing && <Button type="button" variant="outline" onClick={() => { setEditing(null); setForm(blank) }}>Cancel edit</Button>}</div>
          {(create.isError || update.isError || close.isError || cancel.isError) && <p role="alert" className="text-sm text-danger sm:col-span-2">{create.error?.message || update.error?.message || close.error?.message || cancel.error?.message}</p>}
        </form>
      </>}
    </CardContent>
  </Card>
}
