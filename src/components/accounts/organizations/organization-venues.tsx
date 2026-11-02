import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import { archiveOrganizationVenue, createOrganizationVenue, listOrganizationVenues, updateOrganizationVenue, type OrganizationVenue } from '@/services/admin-organizations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const emptyForm = { name: '', address: '', city: '', country: '', capacity: 1, category: '', description: '' }

export function OrganizationVenues({ organizationId, enabled }: { organizationId: string; enabled: boolean }) {
  const { session } = useAuth()
  const client = useQueryClient()
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState<OrganizationVenue | null>(null)
  const venues = useQuery({ queryKey: ['admin-org-venues', organizationId], queryFn: () => listOrganizationVenues(session!.token, organizationId), enabled: Boolean(session?.token) })
  const invalidate = () => client.invalidateQueries({ queryKey: ['admin-org-venues', organizationId] })
  const profileInput = () => ({ ...form, amenities: editing?.amenities ?? [], websiteUrl: editing?.websiteUrl ?? '', socialLinks: editing?.socialLinks ?? {} })
  const create = useMutation({ mutationFn: () => createOrganizationVenue(session!.token, organizationId, { ...profileInput(), amenities: [], websiteUrl: '', socialLinks: {} }), onSuccess: async () => { setForm(emptyForm); await invalidate() } })
  const update = useMutation({ mutationFn: () => updateOrganizationVenue(session!.token, organizationId, editing!.id, profileInput()), onSuccess: async () => { setEditing(null); setForm(emptyForm); await invalidate() } })
  const archive = useMutation({ mutationFn: ({ venue, reason: archiveReason }: { venue: OrganizationVenue; reason: string }) => archiveOrganizationVenue(session!.token, organizationId, venue.id, archiveReason.trim()), onSuccess: invalidate })
  const items = venues.data?.venues ?? []
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (editing) update.mutate(); else create.mutate() }
  return <Card>
    <CardHeader><CardTitle>Organization venues</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      {!enabled && <p className="text-sm text-ink-muted">Approve KYB and activate the host capability to manage organization venues.</p>}
      {venues.isLoading && <p className="text-sm text-ink-muted">Loading venues…</p>}
      {venues.isError && <p role="alert" className="text-sm text-danger">{venues.error.message}</p>}
      {!venues.isLoading && !venues.isError && items.length === 0 && <p className="text-sm text-ink-muted">No organization-managed venues yet.</p>}
      <div className="space-y-2">{items.map((venue) => <article key={venue.id} className="rounded-lg border border-line p-3">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-medium">{venue.name}</h3><p className="text-xs text-ink-muted">{venue.city || 'Location not set'} · {venue.status} · {venue.createdVia}</p><p className="text-xs text-ink-muted">{venue.capacity} capacity</p></div>
          <div className="flex gap-2"><Button type="button" variant="outline" disabled={!enabled || venue.status === 'archived'} onClick={() => { setEditing(venue); setForm({ name: venue.name, address: venue.address ?? '', city: venue.city ?? '', country: venue.country ?? '', capacity: venue.capacity, category: venue.category ?? '', description: venue.description ?? '' }) }}>Edit</Button>{venue.status !== 'archived' && <Button type="button" variant="outline" disabled={!enabled} onClick={() => { const value = window.prompt(`Reason for archiving ${venue.name}`); if (value?.trim()) archive.mutate({ venue, reason: value }) }}>Archive</Button>}</div>
        </div>
      </article>)}</div>
      {enabled && <form className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2" onSubmit={submit}>
        <label className="space-y-1 text-xs font-medium">Venue name<Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label className="space-y-1 text-xs font-medium">Capacity<Input required type="number" min={1} value={form.capacity} onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) })} /></label>
        <label className="space-y-1 text-xs font-medium">Address<Input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
        <label className="space-y-1 text-xs font-medium">City<Input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label>
        <label className="space-y-1 text-xs font-medium">Country<Input value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} /></label>
        <label className="space-y-1 text-xs font-medium">Category<Input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label>
        <div className="flex gap-2 sm:col-span-2"><Button type="submit" disabled={create.isPending || update.isPending}>{editing ? 'Save venue' : 'Create venue'}</Button>{editing && <Button type="button" variant="outline" onClick={() => { setEditing(null); setForm(emptyForm) }}>Cancel edit</Button>}</div>
        {(create.isError || update.isError || archive.isError) && <p role="alert" className="text-sm text-danger sm:col-span-2">{create.error?.message || update.error?.message || archive.error?.message}</p>}
      </form>}
    </CardContent>
  </Card>
}
