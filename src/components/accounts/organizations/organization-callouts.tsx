import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cancelAdminVendorCallout, closeAdminVendorCallout, createOrganizationVendorCallout, listAdminEvents, listAdminVendorCallouts, updateOrganizationVendorCallout, type AdminVendorCallout } from '@/services/admin-events-ticketing'

const blank = { category: 'general', serviceKinds: 'wristbands', opensAt: '', closesAt: '' }
const toLocal = (seconds?: number | string | null) => seconds ? new Date(Number(seconds) * 1000).toISOString().slice(0, 16) : ''
type CalloutDraft = typeof blank

function CalloutEditor({ draft, onDraft, editing, pending, error, onSubmit, onCancel }: {
  draft: CalloutDraft
  onDraft: (draft: CalloutDraft) => void
  editing: boolean
  pending: boolean
  error?: string
  onSubmit: (event: React.FormEvent) => void
  onCancel: () => void
}) {
  return <form className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2" onSubmit={onSubmit}>
    <label className="space-y-1 text-xs font-medium">Category<Input required value={draft.category} onChange={(event) => onDraft({ ...draft, category: event.target.value })} /></label>
    <label className="space-y-1 text-xs font-medium">Service kinds<Input required value={draft.serviceKinds} onChange={(event) => onDraft({ ...draft, serviceKinds: event.target.value })} /></label>
    <label className="space-y-1 text-xs font-medium">Opens at<Input required type="datetime-local" value={draft.opensAt} onChange={(event) => onDraft({ ...draft, opensAt: event.target.value })} /></label>
    <label className="space-y-1 text-xs font-medium">Closes at<Input required type="datetime-local" value={draft.closesAt} onChange={(event) => onDraft({ ...draft, closesAt: event.target.value })} /></label>
    <div className="flex gap-2 sm:col-span-2"><Button type="submit" disabled={pending}>{editing ? 'Save callout' : 'Create callout'}</Button>{editing && <Button type="button" variant="outline" onClick={onCancel}>Cancel edit</Button>}</div>
    {error && <p role="alert" className="text-sm text-danger sm:col-span-2">{error}</p>}
  </form>
}

function CalloutCard({ callout, onEdit, onClose, onCancel }: {
  callout: AdminVendorCallout
  onEdit: () => void
  onClose: () => void
  onCancel: () => void
}) {
  return <article className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-line p-3">
    <div><h3 className="font-medium">{callout.category || 'Vendor callout'}</h3><p className="text-xs text-ink-muted">{(callout.serviceKinds ?? []).filter(Boolean).join(', ')} · {callout.status}</p><p className="text-xs text-ink-muted">{toLocal(callout.opensAt)} – {toLocal(callout.closesAt)}</p></div>
    {callout.status === 'open' && <div className="flex gap-2"><Button type="button" variant="outline" onClick={onEdit}>Edit</Button><Button type="button" variant="outline" onClick={onClose}>Close</Button><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button></div>}
  </article>
}

function CalloutList({ items, loading, error, eventTitle, onEdit, onClose, onCancel }: {
  items: AdminVendorCallout[]
  loading: boolean
  error?: string
  eventTitle?: string | null
  onEdit: (callout: AdminVendorCallout) => void
  onClose: (id: string) => void
  onCancel: (id: string) => void
}) {
  if (loading) return <p className="text-sm text-ink-muted">Loading callouts…</p>
  if (error) return <p role="alert" className="text-sm text-danger">{error}</p>
  if (items.length === 0) return <p className="text-sm text-ink-muted">No callouts for {eventTitle || 'this event'}.</p>
  return <div className="space-y-2">{items.map((callout) => <CalloutCard key={callout.id} callout={callout} onEdit={() => onEdit(callout)} onClose={() => onClose(callout.id)} onCancel={() => onCancel(callout.id)} />)}</div>
}

function OrganizationEventPicker({ enabled, events, eventId, onChange }: { enabled: boolean; events: ReturnType<typeof listAdminEvents> extends Promise<infer T> ? T : never; eventId: string; onChange: (id: string) => void }) {
  if (!enabled) return null
  return <>
    <label className="block space-y-1.5 text-sm font-medium">Organization event<select aria-label="Organization event" value={eventId} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"><option value="">Select an event</option>{events.events.map((event) => <option key={event.id} value={event.id}>{event.title || event.id}</option>)}</select></label>
  </>
}

function OrganizationCalloutWorkspace({ enabled, eventId, selectedEvent, items, form, onDraft, editing, pending, formError, statusError, loading, error, onSubmit, onCancelEdit, onEdit, onClose, onCancel }: {
  enabled: boolean
  eventId: string
  selectedEvent?: { title?: string | null }
  items: AdminVendorCallout[]
  form: CalloutDraft
  onDraft: (draft: CalloutDraft) => void
  editing: boolean
  pending: boolean
  formError?: string
  statusError?: string
  loading: boolean
  error?: string
  onSubmit: (event: React.FormEvent) => void
  onCancelEdit: () => void
  onEdit: (callout: AdminVendorCallout) => void
  onClose: (id: string) => void
  onCancel: (id: string) => void
}) {
  if (!enabled || !eventId) return null
  return <>
    <CalloutList items={items} loading={loading} error={error} eventTitle={selectedEvent?.title} onEdit={onEdit} onClose={onClose} onCancel={onCancel} />
    <CalloutEditor draft={form} onDraft={onDraft} editing={editing} pending={pending} error={formError} onSubmit={onSubmit} onCancel={onCancelEdit} />
    {statusError && <p role="alert" className="text-sm text-danger">{statusError}</p>}
  </>
}

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
  const items = callouts.data?.callouts ?? []
  const formError = create.error?.message || update.error?.message
  const statusError = close.error?.message || cancel.error?.message
  const editCallout = (callout: AdminVendorCallout) => {
    setEditing(callout)
    setForm({ category: callout.category || 'general', serviceKinds: (callout.serviceKinds ?? []).filter(Boolean).join(', '), opensAt: toLocal(callout.opensAt), closesAt: toLocal(callout.closesAt) })
  }
  const closeCallout = (id: string) => close.mutate(id)
  const cancelCallout = (id: string) => { if (window.confirm('Cancel this callout?')) cancel.mutate(id) }
  const cancelEdit = () => { setEditing(null); setForm(blank) }
  return <Card><CardHeader><CardTitle>Organization vendor callouts</CardTitle></CardHeader><CardContent className="space-y-4">
    {!enabled && <p className="text-sm text-ink-muted">Approve KYB and activate the organize capability to manage event callouts.</p>}
    <OrganizationEventPicker enabled={enabled} events={events.data ?? { events: [] }} eventId={eventId} onChange={(id) => { setEventId(id); setEditing(null); setForm(blank) }} />
    {events.isLoading && <p className="text-sm text-ink-muted">Loading events…</p>}{events.isError && <p role="alert" className="text-sm text-danger">{events.error.message}</p>}
    <OrganizationCalloutWorkspace enabled={enabled} eventId={eventId} selectedEvent={selectedEvent} items={items} form={form} onDraft={setForm} editing={Boolean(editing)} pending={create.isPending || update.isPending} formError={formError} statusError={statusError} loading={callouts.isLoading} error={callouts.isError ? callouts.error.message : undefined} onSubmit={submit} onCancelEdit={cancelEdit} onEdit={editCallout} onClose={closeCallout} onCancel={cancelCallout} />
  </CardContent></Card>
}
