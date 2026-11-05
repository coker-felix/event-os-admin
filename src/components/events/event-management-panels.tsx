import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getPublicSiteConfig, listDistributionChannels, type DistributionChannel } from '@/services/admin-platform'
import {
  cancelAdminVendorCallout, closeAdminVendorCallout, createAdminEventCoupon, createOrganizationVendorCallout,
  getAdminEventFeeOverride, listAdminEventCoupons, listAdminEventPublications, listAdminVendorCallouts,
  publishAdminEventToChannel, retryAdminEventPublication, setAdminEventCouponStatus,
  setAdminEventFeeOverride, unpublishAdminEventFromChannel, updateOrganizationVendorCallout,
  type AdminCoupon, type AdminEventPublication, type AdminVendorCallout,
} from '@/services/admin-events-ticketing'

const couponKey = (eventId: string) => ['qk-admin-events', 'detail', eventId, 'coupons'] as const
const publicationKey = (eventId: string) => ['qk-admin-events', 'detail', eventId, 'publications'] as const
const feeOverrideKey = (eventId: string) => ['qk-admin-events', 'detail', eventId, 'fee-override'] as const
const calloutsKey = (eventId: string) => ['qk-admin-events', 'detail', eventId, 'vendor-callouts'] as const

const calloutServiceKinds = [
  ['check_in_assistance', 'Check-in assistance'],
  ['ticket_printing', 'Ticket printing'],
  ['wristbands', 'Wristbands'],
  ['headphones', 'Headphones'],
  ['banners_flyers', 'Banners and flyers'],
  ['venue_rental', 'Venue rental'],
] as const

function localDateTime(seconds?: number | string | null) {
  const value = Number(seconds)
  if (!Number.isFinite(value) || value <= 0) return ''
  const date = new Date(value * 1000)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function unixDateTime(value: string) {
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? Math.floor(date.getTime() / 1000) : 0
}

function calloutDate(seconds?: number | string | null) {
  const value = Number(seconds)
  return Number.isFinite(value) && value > 0
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(value * 1000)
    : 'Not scheduled'
}

function calloutLabel(value: string) {
  return value.split('_').filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')
}

function PanelError({ children }: { children: string }) {
  return <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{children}</p>
}

export function EventVendorCalloutsPanel({ eventId, orgId }: { eventId: string; orgId: string }) {
  const { session } = useAuth()
  const client = useQueryClient()
  const [editing, setEditing] = useState<AdminVendorCallout | null>(null)
  const [category, setCategory] = useState('')
  const [serviceKinds, setServiceKinds] = useState<string[]>([])
  const [opensAt, setOpensAt] = useState('')
  const [closesAt, setClosesAt] = useState('')
  const query = useQuery({
    queryKey: calloutsKey(eventId),
    queryFn: () => listAdminVendorCallouts(session!.token, { eventId, limit: 100, offset: 0 }),
    enabled: Boolean(session?.token),
  })
  const config = useQuery({ queryKey: ['qk-public-platform-config'], queryFn: () => getPublicSiteConfig(session!.token), enabled: Boolean(session?.token) })
  const categories = config.data?.calloutAllowedCategories?.length ? config.data.calloutAllowedCategories : ['pop_up']
  const refresh = () => client.invalidateQueries({ queryKey: calloutsKey(eventId) })
  const resetForm = () => { setEditing(null); setCategory(''); setServiceKinds([]); setOpensAt(''); setClosesAt('') }
  const save = useMutation({
    mutationFn: () => {
      const input = { category: category || categories[0] || '', serviceKinds, opensAt: unixDateTime(opensAt), closesAt: unixDateTime(closesAt) }
      return editing
        ? updateOrganizationVendorCallout(session!.token, orgId, eventId, editing.id, input)
        : createOrganizationVendorCallout(session!.token, orgId, eventId, input)
    },
    onSuccess: async () => { await refresh(); toast.success(editing ? 'Vendor callout updated' : 'Vendor callout created'); resetForm() },
    onError: (error) => toast.error(editing ? 'Could not update callout' : 'Could not create callout', { description: error.message }),
  })
  const close = useMutation({
    mutationFn: (id: string) => closeAdminVendorCallout(session!.token, id),
    onSuccess: async () => { await refresh(); toast.success('Vendor callout closed') },
    onError: (error) => toast.error('Could not close callout', { description: error.message }),
  })
  const cancel = useMutation({
    mutationFn: (id: string) => cancelAdminVendorCallout(session!.token, id),
    onSuccess: async () => { await refresh(); toast.success('Vendor callout cancelled') },
    onError: (error) => toast.error('Could not cancel callout', { description: error.message }),
  })
  const callouts = (query.data?.callouts ?? []).filter((callout) => callout.eventId === eventId)
  const busy = save.isPending || close.isPending || cancel.isPending
  function submit(event: FormEvent) { event.preventDefault(); save.mutate() }
  function beginEdit(callout: AdminVendorCallout) {
    setEditing(callout)
    setCategory(callout.category || categories[0] || '')
    setServiceKinds((callout.serviceKinds ?? []).filter((value): value is string => Boolean(value)))
    setOpensAt(localDateTime(callout.opensAt))
    setClosesAt(localDateTime(callout.closesAt))
  }
  return <div className="space-y-4">
    <Card><CardContent className="space-y-4 pt-5">
      <div><h3 className="font-medium">{editing ? 'Edit vendor callout' : 'Create a vendor callout'}</h3><p className="mt-1 text-sm text-ink-muted">Invite vendors to offer services for this event. Open and close times use your local timezone.</p></div>
      {config.isError && <PanelError>{`Could not load callout categories: ${config.error.message}`}</PanelError>}
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium">Category<select required value={category || categories[0] || ''} onChange={(event) => setCategory(event.target.value)} disabled={config.isLoading || config.isError} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"><option value="" disabled>Select a category</option>{categories.map((value) => <option key={value} value={value}>{calloutLabel(value)}</option>)}</select></label>
          <fieldset className="space-y-2 sm:row-span-2"><legend className="text-sm font-medium">Services requested</legend><div className="grid gap-2 sm:grid-cols-2">{calloutServiceKinds.map(([value, label]) => <label key={value} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm"><input type="checkbox" checked={serviceKinds.includes(value)} onChange={(event) => setServiceKinds((current) => event.target.checked ? [...current, value] : current.filter((kind) => kind !== value))} />{label}</label>)}</div></fieldset>
          <label className="space-y-1.5 text-sm font-medium">Opens at<input required type="datetime-local" value={opensAt} onChange={(event) => setOpensAt(event.target.value)} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm" /></label>
          <label className="space-y-1.5 text-sm font-medium">Closes at<input required type="datetime-local" value={closesAt} onChange={(event) => setClosesAt(event.target.value)} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm" /></label>
        </div>
        <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy || config.isLoading || config.isError || !category || !opensAt || !closesAt || unixDateTime(closesAt) <= unixDateTime(opensAt)}>{save.isPending ? 'Saving…' : editing ? 'Save callout' : 'Create callout'}</Button>{editing && <Button type="button" variant="outline" disabled={busy} onClick={resetForm}>Cancel editing</Button>}</div>
      </form>
      {save.isError && <PanelError>{save.error.message}</PanelError>}
    </CardContent></Card>
    <Card><CardContent className="p-0">
      {query.isLoading ? <p className="p-5 text-sm text-ink-muted">Loading vendor callouts…</p> : query.isError ? <div className="p-5"><PanelError>{query.error.message}</PanelError></div> : callouts.length === 0 ? <div className="p-6"><p className="font-medium">No vendor callouts yet</p><p className="mt-1 text-sm text-ink-muted">Create one above to invite vendors to this event.</p></div> : <div className="divide-y divide-line">{callouts.map((callout) => <div key={callout.id} className="flex flex-wrap items-start justify-between gap-4 p-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{calloutLabel(callout.category || 'vendor_callout')}</p><Badge variant={callout.status === 'open' ? 'default' : 'secondary'}>{callout.status || 'unknown'}</Badge></div><p className="mt-1 text-sm text-ink-muted">{(callout.serviceKinds ?? []).filter((kind): kind is string => Boolean(kind)).map(calloutLabel).join(', ') || 'No services specified'}</p><p className="mt-1 text-xs text-ink-muted">{calloutDate(callout.opensAt)} – {calloutDate(callout.closesAt)}</p></div><div className="flex flex-wrap gap-2">{callout.status === 'open' && <Button size="sm" variant="outline" disabled={busy} onClick={() => beginEdit(callout)}>Edit</Button>}{callout.status === 'open' && <Button size="sm" variant="outline" disabled={busy} onClick={() => close.mutate(callout.id)}>Close</Button>}{(callout.status === 'open' || callout.status === 'closed') && <Button size="sm" variant="outline" disabled={busy} onClick={() => { if (window.confirm('Cancel this callout? Cancelled callouts cannot be reopened.')) cancel.mutate(callout.id) }}>Cancel</Button>}</div></div>)}</div>}
      {(close.isError || cancel.isError) && <div className="border-t border-line px-5 py-3"><PanelError>{close.error?.message || cancel.error?.message || 'Could not update callout.'}</PanelError></div>}
    </CardContent></Card>
  </div>
}

function couponDiscount(coupon: AdminCoupon, currency?: string | null) {
  const value = Number(coupon.value || 0)
  if (coupon.discountType === 'percent') return `${value}% off`
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'GHS' }).format(value / 100) }
  catch { return `${value} minor units` }
}

export function EventCouponsPanel({ eventId, currency }: { eventId: string; currency?: string | null }) {
  const { session } = useAuth()
  const client = useQueryClient()
  const [code, setCode] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [innerTab, setInnerTab] = useState<'coupons' | 'discounts'>('coupons')
  const [discountType, setDiscountType] = useState<'percent' | 'flat_minor'>('percent')
  const [value, setValue] = useState('10')
  const [maxUses, setMaxUses] = useState('')
  const query = useQuery({ queryKey: couponKey(eventId), queryFn: () => listAdminEventCoupons(session!.token, eventId), enabled: Boolean(session?.token) })
  const invalidate = () => client.invalidateQueries({ queryKey: couponKey(eventId) })
  const create = useMutation({
    mutationFn: () => createAdminEventCoupon(session!.token, eventId, { code: code.trim(), discountType, value: Number(value), ...(maxUses ? { maxUses: Number(maxUses) } : {}) }),
    onSuccess: async () => { await invalidate(); setCode(''); setDialogOpen(false); toast.success('Event coupon created') },
    onError: (error) => toast.error('Could not create coupon', { description: error.message }),
  })
  const status = useMutation({
    mutationFn: ({ couponId, next }: { couponId: string; next: 'active' | 'disabled' }) => setAdminEventCouponStatus(session!.token, eventId, couponId, next),
    onSuccess: async () => { await invalidate(); toast.success('Coupon status updated') },
    onError: (error) => toast.error('Could not update coupon', { description: error.message }),
  })
  const coupons = (query.data?.coupons || []).filter((coupon) => coupon.eventId === eventId)
  function submit(event: FormEvent) {
    event.preventDefault()
    create.mutate()
  }
  return <div className="space-y-4">
    <div className="flex gap-2 border-b border-line pb-3"><Button variant={innerTab === 'coupons' ? 'default' : 'outline'} onClick={() => setInnerTab('coupons')}>Coupons</Button><Button variant={innerTab === 'discounts' ? 'default' : 'outline'} onClick={() => setInnerTab('discounts')}>Discounts</Button></div>
    {innerTab === 'coupons' ? <><Card><CardContent className="space-y-4 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-medium">Coupons</h3><p className="mt-1 text-sm text-ink-muted">Attendees must enter a coupon code at checkout to receive the discount.</p></div><Button onClick={() => setDialogOpen(true)}>Add coupon</Button></div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>Add coupon</DialogTitle><DialogDescription>Create an event-specific code attendees can enter at checkout.</DialogDescription></DialogHeader><form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
        <label className="space-y-1.5 text-sm font-medium">Code<Input required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={32} placeholder="EARLYBIRD" /></label>
        <label className="space-y-1.5 text-sm font-medium">Discount<select value={discountType} onChange={(e) => setDiscountType(e.target.value as typeof discountType)} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"><option value="percent">Percentage</option><option value="flat_minor">Fixed amount</option></select></label>
        <label className="space-y-1.5 text-sm font-medium">{discountType === 'percent' ? 'Percent off' : `Amount (${currency || 'minor units'})`}<Input required type="number" min="1" max={discountType === 'percent' ? 99 : undefined} step="1" value={value} onChange={(e) => setValue(e.target.value)} /></label>
        <label className="space-y-1.5 text-sm font-medium">Use limit<Input type="number" min="1" step="1" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Unlimited" /></label>
        <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={create.isPending || !code.trim() || !Number.isInteger(Number(value)) || Number(value) < 1}>{create.isPending ? 'Creating…' : 'Create coupon'}</Button></DialogFooter>
      </form>
      {create.isError && <PanelError>{create.error.message}</PanelError>}
      </DialogContent></Dialog>
    </CardContent></Card>
    <Card><CardContent className="p-0">
      {query.isLoading ? <p className="p-5 text-sm text-ink-muted">Loading coupons…</p> : query.isError ? <div className="p-5"><PanelError>{query.error.message}</PanelError></div> : coupons.length === 0 ? <p className="p-5 text-sm text-ink-muted">No coupons have been created for this event.</p> : <div className="divide-y divide-line">{coupons.map((coupon) => <div key={coupon.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="font-medium">{coupon.code} <Badge variant={coupon.status === 'active' ? 'default' : 'secondary'}>{coupon.status || 'unknown'}</Badge></p><p className="mt-1 text-sm text-ink-muted">{couponDiscount(coupon, currency)} · {Number(coupon.usedCount || 0)} used{Number(coupon.maxUses || 0) > 0 ? ` of ${coupon.maxUses}` : ' · unlimited uses'}</p></div><Button variant="outline" size="sm" disabled={status.isPending} onClick={() => status.mutate({ couponId: coupon.id, next: coupon.status === 'active' ? 'disabled' : 'active' })}>{coupon.status === 'active' ? 'Disable' : 'Enable'}</Button></div>)}</div>}
    </CardContent></Card></> : <Card><CardContent className="space-y-3 pt-5"><div><h3 className="font-medium">Automatic discounts</h3><p className="mt-1 text-sm text-ink-muted">Discounts are applied automatically to eligible orders; attendees do not enter a code.</p></div><p role="status" className="text-sm text-ink-muted">Automatic discount rules are not available in the event API yet.</p><Button disabled title="Automatic discount rules are not supported by the event API yet">Add discount</Button></CardContent></Card>}
  </div>
}

export function EventFeeOverridePanel({ eventId }: { eventId: string }) {
  const { session } = useAuth()
  const client = useQueryClient()
  const query = useQuery({ queryKey: feeOverrideKey(eventId), queryFn: () => getAdminEventFeeOverride(session!.token, eventId), enabled: Boolean(session?.token) })
  const mutation = useMutation({
    mutationFn: (payer: '' | 'attendee' | 'organizer') => setAdminEventFeeOverride(session!.token, eventId, payer),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: feeOverrideKey(eventId) }); toast.success('Organization fee payer updated') },
    onError: (error) => toast.error('Could not update fee payer', { description: error.message }),
  })
  return <Card><CardContent className="space-y-4 pt-5">
    <div><h3 className="font-medium">Organization fee payer</h3><p className="mt-1 text-sm text-ink-muted">This setting applies to every event owned by this organization.</p></div>
    {query.isLoading ? <p className="text-sm text-ink-muted">Loading fee settings…</p> : query.isError ? <PanelError>{query.error.message}</PanelError> : <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-sm font-medium">Override<select value={query.data?.feePayerOverride || ''} disabled={mutation.isPending} onChange={(e) => mutation.mutate(e.target.value as '' | 'attendee' | 'organizer')} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"><option value="">Use platform default</option><option value="attendee">Attendee pays fees</option><option value="organizer">Organization pays fees</option></select></label><div><p className="text-sm font-medium">Effective payer</p><p className="mt-2 text-sm text-ink-muted">{query.data?.effectiveFeePayer === 'organizer' ? 'Organization' : query.data?.effectiveFeePayer === 'attendee' ? 'Attendee' : query.data?.effectiveFeePayer || 'Platform default'}</p>{mutation.isError && <p role="alert" className="mt-2 text-sm text-danger">{mutation.error.message}</p>}</div></div>}
  </CardContent></Card>
}

export function EventPublishingChannelsPanel({ eventId }: { eventId: string }) {
  const { session } = useAuth()
  const client = useQueryClient()
  const channels = useQuery({ queryKey: ['qk-admin-distribution-channels'], queryFn: () => listDistributionChannels(session!.token), enabled: Boolean(session?.token) })
  const publications = useQuery({ queryKey: publicationKey(eventId), queryFn: () => listAdminEventPublications(session!.token, eventId), enabled: Boolean(session?.token) })
  const invalidate = () => client.invalidateQueries({ queryKey: publicationKey(eventId) })
  const action = useMutation({
    mutationFn: ({ channel, operation }: { channel: string; operation: 'publish' | 'unpublish' | 'retry' }) => operation === 'publish'
      ? publishAdminEventToChannel(session!.token, eventId, channel)
      : operation === 'unpublish'
        ? unpublishAdminEventFromChannel(session!.token, eventId, channel)
        : retryAdminEventPublication(session!.token, eventId, channel),
    onSuccess: async (_result, variables) => { await invalidate(); toast.success(variables.operation === 'unpublish' ? 'Event unpublished from channel' : variables.operation === 'retry' ? 'Publication retry queued' : 'Event publication queued') },
    onError: (error) => toast.error('Could not update publication', { description: error.message }),
  })
  const rows = channels.data?.distributionChannels || []
  const publicationRows = publications.data?.publications || []
  const statusFor = (key: string): AdminEventPublication | undefined => publicationRows.find((row) => row.distributionChannelKey === key)
  return <Card><CardContent className="p-0">
    {channels.isLoading || publications.isLoading ? <p className="p-5 text-sm text-ink-muted">Loading publishing channels…</p> : channels.isError ? <div className="p-5"><PanelError>{channels.error.message}</PanelError></div> : publications.isError ? <div className="p-5"><PanelError>{publications.error.message}</PanelError></div> : rows.length === 0 ? <p className="p-5 text-sm text-ink-muted">No publishing channels are configured. Add one in Platform settings.</p> : <div className="divide-y divide-line">{rows.map((channel: DistributionChannel) => {
      const publication = statusFor(channel.key)
      const published = publication?.status === 'published'
      const failed = publication?.status === 'failed'
      const operation = published ? 'unpublish' : failed ? 'retry' : 'publish'
      return <div key={channel.key} className="flex flex-wrap items-center justify-between gap-4 p-4"><div><p className="font-medium">{channel.displayName || channel.key}</p><p className="mt-1 text-sm text-ink-muted">{channel.key} · {channel.adapterType}{publication?.lastError ? ` · ${publication.lastError}` : ''}</p></div><div className="flex items-center gap-3"><Badge variant={published ? 'default' : failed ? 'destructive' : 'secondary'}>{publication?.status || (channel.enabled ? 'not published' : 'disabled')}</Badge><Button variant="outline" size="sm" disabled={!channel.enabled && !published || action.isPending} onClick={() => action.mutate({ channel: channel.key, operation })}>{action.isPending ? 'Working…' : published ? 'Unpublish' : failed ? 'Retry' : 'Publish'}</Button></div></div>
    })}</div>}
  </CardContent></Card>
}
