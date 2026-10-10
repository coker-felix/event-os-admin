import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import { AppIconAction } from '@/components/ui/app-icon-action'
import { AppPagination } from '@/components/ui/app-pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  createDirectoryVenue, decideVenueClaim, getOrganizationCommerceProfile, getVenueOwnershipHistory, listAdminOrganizations, listOrganizationMembers, listPendingVenueClaims, listVenueDirectory, listVenueOrganizationReconciliation, listVendorDirectory, listVendorOrganizationReconciliation,
  resolveVenueOrganization, resolveVendorOrganization, reviewOrganizationTaxExemption, setVenueStatus, setVendorStatus, updateVendorTier, type AdminVenueClaim, type VenueDirectoryEntry, type VendorDirectoryEntry,
} from '@/services/admin-account-directory'

const pageSize = 10
const vendorKey = ['qk-admin-vendor-directory'] as const
const venueKey = ['qk-admin-venue-directory'] as const
const vendorOrgQueueKey = ['qk-admin-vendor-org-reconciliation'] as const
const venueOrgQueueKey = ['qk-admin-venue-org-reconciliation'] as const
const venueClaimsKey = ['qk-admin-venue-claims'] as const

function ErrorMessage({ children }: { children: string }) {
  return <p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">{children}</p>
}

function Identity({ name, secondary }: { name: string; secondary?: string }) {
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?'
  return <div className="flex min-w-0 items-center gap-3"><span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">{initials}</span><span className="min-w-0"><span className="block truncate font-medium text-ink">{name}</span><span className="block truncate text-xs text-ink-muted">{secondary || 'Details unavailable'}</span></span></div>
}

function DirectoryTable<T extends { id: string }>({
  title, description, rows, isLoading, error, search, onSearch, emptyTitle, emptyMessage, columns, renderRow, label,
}: {
  title: string
  description: string
  rows: T[]
  isLoading: boolean
  error: string | null
  search: string
  onSearch: (value: string) => void
  emptyTitle: string
  emptyMessage: string
  columns: string[]
  renderRow: (row: T) => React.ReactNode
  label: string
}) {
  const [pageIndex, setPageIndex] = useState(0)
  const filtered = useMemo(() => rows.filter((row) => JSON.stringify(row).toLowerCase().includes(search.trim().toLowerCase())), [rows, search])
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
  return <Card>
    <CardHeader className="border-b border-line sm:grid-cols-[1fr_auto] sm:items-center"><div><CardTitle>{title}</CardTitle><p data-slot="card-description" className="text-sm text-ink-muted">{description}</p></div><Input aria-label={`Search ${label}`} placeholder={`Search ${label}`} value={search} onChange={(event) => { onSearch(event.target.value); setPageIndex(0) }} className="sm:w-64" /></CardHeader>
    <CardContent className="p-0">
      {isLoading ? <p className="px-6 py-10 text-center text-sm text-ink-muted">Loading {label}…</p>
        : error ? <div className="m-5"><ErrorMessage>{error}</ErrorMessage></div>
          : <div className="overflow-x-auto"><Table aria-label={title}>
            <TableHeader><TableRow>{columns.map((column, index) => <TableHead key={column} className={`${index < columns.length - 1 ? 'border-r border-line' : ''} ${column === 'Capacity' ? 'text-right' : index === columns.length - 1 ? 'text-right' : ''}`}>{column}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{visible.length ? visible.map((row) => renderRow(row)) : <TableRow><TableCell colSpan={columns.length} className="h-32 text-center">
              {search ? <p className="text-sm text-ink-muted">No {label} match “{search}”. Try another search.</p> : rows.length === 0 ? <div><p className="text-sm font-medium text-ink">{emptyTitle}</p><p className="mt-1 text-sm text-ink-muted">{emptyMessage}</p></div> : <p className="text-sm text-ink-muted">No {label} on this page.</p>}
            </TableCell></TableRow>}</TableBody>
          </Table></div>}
      <AppPagination pageIndex={pageIndex} pageSize={pageSize} totalItems={filtered.length} onPageChange={(index) => setPageIndex(Math.min(index, pageCount - 1))} label={label} />
    </CardContent>
  </Card>
}

interface OrganizationLinkItem {
  id: string
  name: string
  ownerAccountId?: string | null
}

function ResolveOrganizationRow({ item, queueKey, resolve }: { item: OrganizationLinkItem; queueKey: readonly unknown[]; resolve: (orgId: string, reason: string) => Promise<unknown> }) {
  const queryClient = useQueryClient()
  const [organizationId, setOrganizationId] = useState('')
  const [reason, setReason] = useState('')
  const mutation = useMutation({
    mutationFn: () => resolve(organizationId.trim(), reason.trim()),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: queueKey }) },
  })
  return <TableRow>
    <TableCell className="border-r border-line"><Identity name={item.name || 'Unnamed profile'} secondary={`Profile ${item.id}${item.ownerAccountId ? ` · Owner ${item.ownerAccountId}` : ''}`} /></TableCell>
    <TableCell><form className="grid gap-2 sm:grid-cols-[minmax(140px,1fr)_minmax(160px,1.4fr)_auto]" onSubmit={(event) => { event.preventDefault(); mutation.mutate() }}>
      <Input aria-label={`Managing organization ID for ${item.name}`} placeholder="Organization ID" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} required />
      <Input aria-label={`Reason for linking ${item.name}`} placeholder="Reason for decision" value={reason} onChange={(event) => setReason(event.target.value)} required />
      <Button type="submit" size="sm" disabled={mutation.isPending || !organizationId.trim() || !reason.trim()}>{mutation.isPending ? 'Saving…' : 'Link organization'}</Button>
    </form>{mutation.isError && <p role="alert" className="mt-2 text-xs text-danger">{mutation.error.message}</p>}</TableCell>
  </TableRow>
}

function OrganizationReconciliationQueue({ title, description, items, loading, error, queueKey, resolve }: {
  title: string
  description: string
  items: OrganizationLinkItem[]
  loading: boolean
  error: string | null
  queueKey: readonly unknown[]
  resolve: (id: string, orgId: string, reason: string) => Promise<unknown>
}) {
  const [pageIndex, setPageIndex] = useState(0)
  const visibleItems = items.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  return <Card>
    <CardHeader className="border-b border-line"><div><CardTitle>{title}</CardTitle><p data-slot="card-description" className="text-sm text-ink-muted">{description}</p></div></CardHeader>
    <CardContent className="p-0">{loading ? <p className="px-6 py-10 text-center text-sm text-ink-muted">Loading organization-link queue…</p>
      : error ? <div className="m-5"><ErrorMessage>{error}</ErrorMessage></div>
        : <div className="overflow-x-auto"><Table aria-label={title}><TableHeader><TableRow><TableHead className="border-r border-line">Profile</TableHead><TableHead>Assign managing organization</TableHead></TableRow></TableHeader>
          <TableBody>{visibleItems.length ? visibleItems.map((item) => <ResolveOrganizationRow key={item.id} item={item} queueKey={queueKey} resolve={(orgId, reason) => resolve(item.id, orgId, reason)} />)
            : <TableRow><TableCell colSpan={2} className="h-24 text-center text-sm text-ink-muted">No organization links need review.</TableCell></TableRow>}</TableBody>
        </Table></div>}
      <AppPagination pageIndex={pageIndex} pageSize={pageSize} totalItems={items.length} onPageChange={(index) => setPageIndex(Math.min(index, pageCount - 1))} label="organization links" />
    </CardContent>
  </Card>
}

function ProfileStatusControl({ kind }: { kind: 'vendor' | 'venue' }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [id, setId] = useState('')
  const [status, setStatus] = useState<'pending_approval' | 'active' | 'suspended'>('suspended')
  const mutation = useMutation({
    mutationFn: () => kind === 'vendor' ? setVendorStatus(session!.token, id.trim(), status) : setVenueStatus(session!.token, id.trim(), status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: kind === 'vendor' ? vendorKey : venueKey })
    },
  })
  const label = kind === 'vendor' ? 'vendor' : 'venue'
  return <Card><CardHeader><CardTitle>Change {label} status</CardTitle><p data-slot="card-description" className="text-sm text-ink-muted">Use a {label} profile ID to update a pending or suspended listing.</p></CardHeader><CardContent className="space-y-3">
    <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); mutation.mutate() }}><label htmlFor={`${kind}-status-id`} className="sr-only">{label} profile ID</label><Input id={`${kind}-status-id`} placeholder={`${kind === 'vendor' ? 'Vendor' : 'Venue'} profile ID`} value={id} onChange={(event) => setId(event.target.value)} required className="sm:max-w-xs" /><label htmlFor={`${kind}-status-value`} className="sr-only">New status</label><select id={`${kind}-status-value`} value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="h-10 rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand"><option value="pending_approval">Pending approval</option><option value="active">Active</option><option value="suspended">Suspended</option></select><Button type="submit" disabled={!id.trim() || mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Update status'}</Button></form>
    {mutation.isSuccess && <p role="status" className="text-sm text-success">{label[0].toUpperCase() + label.slice(1)} status updated to {mutation.data?.status || status}.</p>}
    {mutation.isError && <ErrorMessage>{mutation.error.message}</ErrorMessage>}
    <p className="text-xs text-ink-muted">When contract onboarding is enabled, the gateway may reject activation until the contract and verification requirements are met.</p>
  </CardContent></Card>
}

function VenueClaimDecisionDialog({ claim, decision, onClose }: { claim: AdminVenueClaim | null; decision: 'approve' | 'reject'; onClose: () => void }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [note, setNote] = useState('')
  const mutation = useMutation({
    mutationFn: () => decideVenueClaim(session!.token, claim!.id, decision, note),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: venueClaimsKey }); await queryClient.invalidateQueries({ queryKey: venueKey }); setNote(''); onClose() },
  })
  return <Dialog open={Boolean(claim)} onOpenChange={(open) => { if (!open) onClose() }}><DialogContent>
    <DialogHeader><DialogTitle>{decision === 'approve' ? 'Approve venue claim?' : 'Reject venue claim?'}</DialogTitle><DialogDescription>{decision === 'approve' ? 'Approval transfers venue ownership to the claimant and may open venue verification.' : 'The claim will be marked rejected.'}</DialogDescription></DialogHeader>
    <label htmlFor="claim-decision-note" className="block space-y-1.5 text-sm font-medium">Review note <span className="font-normal text-ink-muted">(optional)</span><textarea id="claim-decision-note" value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand" /></label>
    {mutation.isError && <ErrorMessage>{mutation.error.message}</ErrorMessage>}
    <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant={decision === 'reject' ? 'destructive' : 'default'} disabled={mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Saving…' : decision === 'approve' ? 'Approve claim' : 'Reject claim'}</Button></DialogFooter>
  </DialogContent></Dialog>
}

function VenueClaimsQueue() {
  const { session } = useAuth()
  const claimsQuery = useQuery({ queryKey: venueClaimsKey, queryFn: () => listPendingVenueClaims(session!.token), enabled: Boolean(session?.token) })
  const [review, setReview] = useState<{ claim: AdminVenueClaim; decision: 'approve' | 'reject' } | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const claims = claimsQuery.data?.claims ?? []
  const pageCount = Math.max(1, Math.ceil(claims.length / pageSize))
  const visibleClaims = claims.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
  return <Card><CardHeader className="border-b border-line"><div><CardTitle>Venue claims</CardTitle><p data-slot="card-description" className="text-sm text-ink-muted">Review ownership requests for venues in the directory.</p></div></CardHeader><CardContent className="p-0">
    {claimsQuery.isLoading ? <p className="px-6 py-10 text-center text-sm text-ink-muted">Loading venue claims…</p> : claimsQuery.isError ? <div className="m-5"><ErrorMessage>{claimsQuery.error.message}</ErrorMessage></div> : <div className="overflow-x-auto"><Table aria-label="Pending venue claims"><TableHeader><TableRow><TableHead className="border-r border-line">Claimant</TableHead><TableHead className="border-r border-line">Venue</TableHead><TableHead className="border-r border-line">Evidence types</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
      {visibleClaims.length ? visibleClaims.map((item) => <TableRow key={item.id}>
        <TableCell className="border-r border-line"><Identity name={item.claimantAccountId ? `Claim by ${item.claimantAccountId}` : 'Venue claim'} secondary={`Claim ${item.id}`} /></TableCell>
        <TableCell className="border-r border-line"><Identity name="Venue profile" secondary={item.venueId || 'Venue unavailable'} />{item.designatedOrgId && <span className="mt-1 block break-all text-xs text-ink-muted">Organization: {item.designatedOrgId}</span>}</TableCell>
        <TableCell className="border-r border-line">{(item.evidence ?? []).filter(Boolean).map((evidence) => evidence?.kind).filter(Boolean).join(', ') || 'No evidence listed'}</TableCell>
        <TableCell className="text-right"><div className="flex justify-end gap-1"><AppIconAction label="Approve venue claim" icon={<span aria-hidden="true">✓</span>} showLabel onClick={() => setReview({ claim: item, decision: 'approve' })} /><AppIconAction label="Reject venue claim" icon={<span aria-hidden="true">×</span>} onClick={() => setReview({ claim: item, decision: 'reject' })} /></div></TableCell>
      </TableRow>) : <TableRow><TableCell colSpan={4} className="h-28 text-center text-sm text-ink-muted">No pending venue claims.</TableCell></TableRow>}
    </TableBody></Table></div>}
    <AppPagination pageIndex={pageIndex} pageSize={pageSize} totalItems={claims.length} onPageChange={(index) => setPageIndex(Math.min(index, pageCount - 1))} label="venue claims" />
    <VenueClaimDecisionDialog key={`${review?.claim.id ?? 'no-claim'}-${review?.decision ?? 'approve'}`} claim={review?.claim ?? null} decision={review?.decision ?? 'approve'} onClose={() => setReview(null)} />
  </CardContent></Card>
}

function VendorTierDialog({ vendor, onClose }: { vendor: VendorDirectoryEntry | null; onClose: () => void }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [tier, setTier] = useState<NonNullable<VendorDirectoryEntry['tier']>>(vendor?.tier || 'normal')
  const mutation = useMutation({
    mutationFn: () => updateVendorTier(session!.token, vendor!.id, tier),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: vendorKey }); onClose() },
  })
  return <Dialog open={Boolean(vendor)} onOpenChange={(open) => { if (!open) onClose() }}><DialogContent>
    <DialogHeader><DialogTitle>Vendor directory tier</DialogTitle><DialogDescription>Set the public directory tier for {vendor?.businessName || 'this vendor'}.</DialogDescription></DialogHeader>
    <label className="block space-y-1.5 text-sm font-medium" htmlFor="vendor-tier">Tier</label>
    <select id="vendor-tier" value={tier} onChange={(event) => setTier(event.target.value as typeof tier)} className="h-10 rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand"><option value="normal">Normal</option><option value="verified">Verified</option><option value="partnered">Partnered</option></select>
    {mutation.isError && <ErrorMessage>{mutation.error.message}</ErrorMessage>}
    <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Saving…' : 'Save tier'}</Button></DialogFooter>
  </DialogContent></Dialog>
}

export function AccountsVendorsPage() {
  const { session } = useAuth()
  const query = useQuery({ queryKey: vendorKey, queryFn: () => listVendorDirectory(session!.token), enabled: Boolean(session?.token) })
  const reconciliation = useQuery({ queryKey: vendorOrgQueueKey, queryFn: () => listVendorOrganizationReconciliation(session!.token), enabled: Boolean(session?.token) })
  const [search, setSearch] = useState('')
  const [vendor, setVendor] = useState<VendorDirectoryEntry | null>(null)
  const vendors = query.data?.vendors ?? []
  return <section className="space-y-6">
    <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Accounts</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Vendors</h1><p className="mt-2 max-w-2xl text-sm text-ink-muted">Browse active public listings and manage their directory tier.</p></div>
    <div role="note" className="rounded-card border border-brand/15 bg-brand-soft/50 px-4 py-3 text-sm leading-6 text-ink-muted">The public directory shows active vendors only. Pending and suspended accounts are not included by the current listing endpoint.</div>
    <OrganizationReconciliationQueue title="Managing organization review" description="Assign the verified organization that manages each unlinked vendor profile." items={(reconciliation.data?.items ?? []).map((item) => ({ id: item.vendorId, name: item.businessName || 'Unnamed vendor', ownerAccountId: item.ownerAccountId }))} loading={reconciliation.isLoading} error={reconciliation.isError ? reconciliation.error.message : null} queueKey={vendorOrgQueueKey} resolve={(id, orgId, reason) => resolveVendorOrganization(session!.token, id, orgId, reason)} />
    <DirectoryTable title="Active vendor directory" description={`${vendors.length} active listings returned`} rows={vendors} isLoading={query.isLoading} error={query.isError ? query.error.message : null} search={search} onSearch={setSearch} emptyTitle="No active vendor listings" emptyMessage="Active vendors will appear here when available." columns={['Vendor', 'Tier', 'Actions']} label="vendors" renderRow={(item) => <TableRow key={item.id}>
      <TableCell className="border-r border-line"><Identity name={item.businessName || 'Unnamed vendor'} secondary="Public directory listing" /></TableCell>
      <TableCell className="border-r border-line">{item.tier === 'partnered' ? <Badge className="bg-brand-soft text-brand">Partnered</Badge> : item.tier === 'verified' ? <Badge className="bg-success-soft text-success">Verified</Badge> : <Badge variant="outline">Normal</Badge>}</TableCell>
      <TableCell className="text-right"><div className="flex justify-end"><AppIconAction label={`Change directory tier for ${item.businessName || 'vendor'}`} icon={<span aria-hidden="true">◇</span>} onClick={() => setVendor(item)} /></div></TableCell>
    </TableRow>} />
    <ProfileStatusControl kind="vendor" />
    <VendorTierDialog key={vendor?.id ?? 'no-vendor'} vendor={vendor} onClose={() => setVendor(null)} />
  </section>
}

function VenueCreationDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [duplicateCandidates, setDuplicateCandidates] = useState<VenueDirectoryEntry[]>([])
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [address, setAddress] = useState('')
  const [category, setCategory] = useState('')
  const [capacity, setCapacity] = useState('')
  const [description, setDescription] = useState('')
  const reset = () => { setDuplicateCandidates([]); setError(''); setPending(false); setName(''); setCity(''); setCountry(''); setAddress(''); setCategory(''); setCapacity(''); setDescription('') }
  async function submit(confirmNotDuplicate = false) {
    setError('')
    setPending(true)
    try {
      const result = await createDirectoryVenue(session!.token, {
        name: name.trim(),
        capacity: Number(capacity),
        ...(address.trim() ? { address: address.trim() } : {}),
        ...(city.trim() ? { city: city.trim() } : {}),
        ...(country.trim() ? { country: country.trim() } : {}),
        ...(category.trim() ? { category: category.trim() } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(confirmNotDuplicate ? { confirmNotDuplicate: true } : {}),
      })
      if (!result || typeof result !== 'object') throw new Error('The venue service returned no creation result.')
      if (result.created) {
        await queryClient.invalidateQueries({ queryKey: venueKey })
        reset(); onOpenChange(false)
      } else {
        setDuplicateCandidates(Array.isArray(result.duplicateCandidates) ? result.duplicateCandidates.filter((candidate): candidate is VenueDirectoryEntry => Boolean(candidate?.id)) : [])
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create this venue.')
    } finally {
      setPending(false)
    }
  }
  return <Sheet open={open} onOpenChange={(next) => { if (!next) reset(); onOpenChange(next) }}><SheetContent className="w-full overflow-y-auto sm:max-w-lg">
    <SheetHeader><SheetTitle>Add directory venue</SheetTitle><SheetDescription>Create an unclaimed venue listing. Capacity is required; blank optional fields are omitted.</SheetDescription></SheetHeader>
    <form id="create-directory-venue" className="flex-1 space-y-3 overflow-y-auto px-6 pb-6" onSubmit={(event: FormEvent) => { event.preventDefault(); void submit() }}>
      <label className="block space-y-1.5 text-sm font-medium">Venue name<Input required value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label className="block space-y-1.5 text-sm font-medium">Capacity<Input required type="number" min="1" step="1" value={capacity} onChange={(event) => setCapacity(event.target.value)} /></label>
      <label className="block space-y-1.5 text-sm font-medium">Address <span className="font-normal text-ink-muted">(optional)</span><Input value={address} onChange={(event) => setAddress(event.target.value)} /></label>
      <label className="block space-y-1.5 text-sm font-medium">City <span className="font-normal text-ink-muted">(optional)</span><Input value={city} onChange={(event) => setCity(event.target.value)} /></label>
      <label className="block space-y-1.5 text-sm font-medium">Country <span className="font-normal text-ink-muted">(optional)</span><Input value={country} onChange={(event) => setCountry(event.target.value)} /></label>
      <label className="block space-y-1.5 text-sm font-medium">Category <span className="font-normal text-ink-muted">(optional)</span><Input value={category} onChange={(event) => setCategory(event.target.value)} /></label>
      <label className="block space-y-1.5 text-sm font-medium">Description <span className="font-normal text-ink-muted">(optional)</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand" /></label>
    </form>
    {error && <div className="px-6"><ErrorMessage>{error}</ErrorMessage></div>}
    {duplicateCandidates.length > 0 && <div className="mx-6 space-y-2 rounded-lg border border-warning/30 bg-warning-soft p-3"><p className="text-sm font-medium">Possible duplicate venues</p><ul className="list-disc space-y-1 pl-5 text-sm">{duplicateCandidates.map((candidate) => <li key={candidate.id}>{candidate.name || 'Unnamed venue'}{candidate.city ? ` · ${candidate.city}` : ''}{candidate.country ? `, ${candidate.country}` : ''}</li>)}</ul><p className="text-xs text-ink-muted">Confirm only if this is a separate venue.</p></div>}
    <SheetFooter className="border-t border-line"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>{duplicateCandidates.length ? <Button disabled={pending} onClick={() => void submit(true)}>{pending ? 'Creating…' : 'Create anyway'}</Button> : <Button type="submit" form="create-directory-venue" disabled={pending || !name.trim() || !capacity || Number(capacity) < 1}>{pending ? 'Checking…' : 'Check and create'}</Button>}</SheetFooter>
  </SheetContent></Sheet>
}

function VenueOwnershipDialog({ venue, onClose }: { venue: VenueDirectoryEntry | null; onClose: () => void }) {
  const { session } = useAuth()
  const query = useQuery({ queryKey: [...venueKey, 'ownership', venue?.id], queryFn: () => getVenueOwnershipHistory(session!.token, venue!.id), enabled: Boolean(session?.token && venue) })
  const events = Array.isArray(query.data?.events) ? query.data.events.filter((event): event is NonNullable<typeof event> => Boolean(event?.id)) : []
  return <Dialog open={Boolean(venue)} onOpenChange={(open) => { if (!open) onClose() }}><DialogContent>
    <DialogHeader><DialogTitle>Venue ownership history</DialogTitle><DialogDescription>{venue?.name || 'Venue'} · {venue?.city || 'Location unavailable'}</DialogDescription></DialogHeader>
    {query.isLoading ? <p className="py-5 text-sm text-ink-muted">Loading ownership history…</p> : query.isError ? <ErrorMessage>{query.error.message}</ErrorMessage> : events.length ? <ol className="space-y-3">{events.map((event) => <li key={event.id} className="border-l-2 border-line pl-3"><p className="text-sm font-medium">{(event.reason || 'ownership event').replaceAll('_', ' ')}</p><p className="mt-1 break-all text-xs text-ink-muted">{event.fromAccountId || 'Unowned'} → {event.toAccountId || 'Unknown owner'}</p></li>)}</ol> : <p className="py-5 text-sm text-ink-muted">No ownership events recorded.</p>}
    <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
  </DialogContent></Dialog>
}

export function AccountsVenuesPage() {
  const { session } = useAuth()
  const query = useQuery({ queryKey: venueKey, queryFn: () => listVenueDirectory(session!.token), enabled: Boolean(session?.token) })
  const reconciliation = useQuery({ queryKey: venueOrgQueueKey, queryFn: () => listVenueOrganizationReconciliation(session!.token), enabled: Boolean(session?.token) })
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [historyVenue, setHistoryVenue] = useState<VenueDirectoryEntry | null>(null)
  const venues = query.data?.venues ?? []
  return <section className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Accounts</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Venues</h1><p className="mt-2 max-w-2xl text-sm text-ink-muted">Browse active venue listings, create directory entries, and inspect ownership history.</p></div><Button onClick={() => setCreateOpen(true)}>Add directory venue</Button></div>
    <div role="note" className="rounded-card border border-brand/15 bg-brand-soft/50 px-4 py-3 text-sm leading-6 text-ink-muted">The public directory includes active claimed and unclaimed venues. Pending and suspended venues are not included in the listing endpoint.</div>
    <VenueClaimsQueue />
    <OrganizationReconciliationQueue title="Managing organization review" description="Assign the verified organization that manages each unlinked venue profile." items={(reconciliation.data?.items ?? []).map((item) => ({ id: item.venueId, name: item.name || 'Unnamed venue', ownerAccountId: item.ownerAccountId }))} loading={reconciliation.isLoading} error={reconciliation.isError ? reconciliation.error.message : null} queueKey={venueOrgQueueKey} resolve={(id, orgId, reason) => resolveVenueOrganization(session!.token, id, orgId, reason)} />
    <DirectoryTable title="Active venue directory" description={`${venues.length} active listings returned`} rows={venues} isLoading={query.isLoading} error={query.isError ? query.error.message : null} search={search} onSearch={setSearch} emptyTitle="No active venue listings" emptyMessage="Add a directory venue or wait for an active venue to appear." columns={['Venue', 'Capacity', 'Claim status', 'Actions']} label="venues" renderRow={(venue) => <TableRow key={venue.id}>
      <TableCell className="border-r border-line"><Identity name={venue.name || 'Unnamed venue'} secondary={[venue.city, venue.country].filter(Boolean).join(', ') || 'Directory listing'} /></TableCell>
      <TableCell className="border-r border-line text-right">{typeof venue.capacity === 'number' ? venue.capacity.toLocaleString() : '—'}</TableCell>
      <TableCell className="border-r border-line">{venue.claimed === true ? <Badge className="bg-success-soft text-success">Claimed</Badge> : venue.claimed === false ? <Badge variant="outline">Unclaimed</Badge> : <Badge variant="outline">Unknown</Badge>}</TableCell>
      <TableCell className="text-right"><div className="flex justify-end"><AppIconAction label={`View ownership history for ${venue.name || 'venue'}`} icon={<span aria-hidden="true">◷</span>} onClick={() => setHistoryVenue(venue)} /></div></TableCell>
    </TableRow>} />
    <ProfileStatusControl kind="venue" />
    <VenueCreationDialog open={createOpen} onOpenChange={setCreateOpen} />
    <VenueOwnershipDialog venue={historyVenue} onClose={() => setHistoryVenue(null)} />
  </section>
}

export function AccountsOrganizationsPage() {
  const { session } = useAuth()
  const organizationsQuery = useQuery({ queryKey: ['qk-admin-organizations'], queryFn: () => listAdminOrganizations(session!.token), enabled: Boolean(session?.token) })
  const [search, setSearch] = useState('')
  const [orgId, setOrgId] = useState('')
  const [lookupId, setLookupId] = useState('')
  const [reviewing, setReviewing] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['qk-admin-org-commerce-profile', lookupId], queryFn: () => getOrganizationCommerceProfile(session!.token, lookupId), enabled: Boolean(session?.token && lookupId) })
  const review = useMutation({
    mutationFn: ({ country, subdivision, status }: { country: string; subdivision?: string; status: 'approved' | 'rejected' }) => reviewOrganizationTaxExemption(session!.token, lookupId, { country, ...(subdivision ? { subdivision } : {}), status }),
    onSuccess: async (profile) => { queryClient.setQueryData(['qk-admin-org-commerce-profile', lookupId], profile); setReviewing(null) },
  })
  const exemptions = (query.data?.exemptions ?? []).filter((item): item is NonNullable<typeof item> => Boolean(item))
  const organizations = organizationsQuery.data?.organizations ?? []
  const filteredOrganizations = organizations.filter((organization) => `${organization.name ?? ''} ${organization.slug ?? ''} ${organization.id} ${organization.status ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()))
  function submitLookup(event: FormEvent) { event.preventDefault(); setLookupId(orgId.trim()) }
  return <section className="space-y-6">
    <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Accounts</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Organizations</h1><p className="mt-2 max-w-2xl text-sm text-ink-muted">Browse organizations, then look up commerce profiles and review pending tax exemptions.</p></div>
    <Card><CardHeader className="border-b border-line sm:grid-cols-[1fr_auto] sm:items-center"><div><CardTitle>Organization directory</CardTitle><p data-slot="card-description" className="text-sm text-ink-muted">{organizations.length} organizations</p></div><Input aria-label="Search organizations" placeholder="Search name, ID, or status" value={search} onChange={(event) => setSearch(event.target.value)} className="sm:w-72" /></CardHeader><CardContent className="p-0">
      {organizationsQuery.isLoading ? <p className="px-6 py-10 text-center text-sm text-ink-muted">Loading organizations…</p> : organizationsQuery.isError ? <div className="m-5"><ErrorMessage>{organizationsQuery.error.message}</ErrorMessage></div> : <div className="overflow-x-auto"><Table aria-label="Organization directory"><TableHeader><TableRow><TableHead className="border-r border-line">Organization</TableHead><TableHead className="border-r border-line">Status</TableHead><TableHead className="text-right">ID</TableHead></TableRow></TableHeader><TableBody>{filteredOrganizations.length ? filteredOrganizations.map((organization) => <TableRow key={organization.id}><TableCell className="border-r border-line"><Identity name={organization.name || organization.slug || 'Unnamed organization'} secondary={organization.slug || organization.id} /></TableCell><TableCell className="border-r border-line">{organization.status || 'Unknown'}</TableCell><TableCell className="text-right break-all text-xs text-ink-muted">{organization.id}</TableCell></TableRow>) : <TableRow><TableCell colSpan={3} className="h-28 text-center text-sm text-ink-muted">{organizations.length ? 'No organizations match this search.' : 'No organizations found.'}</TableCell></TableRow>}</TableBody></Table></div>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Organization lookup</CardTitle><p data-slot="card-description" className="text-sm text-ink-muted">Enter an organization ID to retrieve its admin commerce profile.</p></CardHeader><CardContent>
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={submitLookup}><label htmlFor="org-id" className="sr-only">Organization ID</label><Input id="org-id" placeholder="Organization ID" value={orgId} onChange={(event) => setOrgId(event.target.value)} required className="sm:max-w-md" /><Button type="submit" disabled={!orgId.trim()}>Look up organization</Button></form>
      {query.isLoading && <p className="mt-5 text-sm text-ink-muted">Loading organization commerce profile…</p>}
      {query.isError && <div className="mt-5"><ErrorMessage>{query.error.message}</ErrorMessage></div>}
      {query.data && <div className="mt-6 space-y-5 border-t border-line pt-5">
        <dl className="grid gap-4 sm:grid-cols-3"><div><dt className="text-xs text-ink-muted">Organization</dt><dd className="mt-1 break-all text-sm font-medium">{query.data.orgId || lookupId}</dd></div><div><dt className="text-xs text-ink-muted">Fee payer override</dt><dd className="mt-1 text-sm">{query.data.feePayerOverride || 'Platform default'}</dd></div><div><dt className="text-xs text-ink-muted">Effective fee payer</dt><dd className="mt-1 text-sm">{query.data.effectiveFeePayer || 'Unknown'}</dd></div></dl>
        <div><h3 className="text-sm font-semibold">Tax registrations</h3>{(query.data.registrations ?? []).filter(Boolean).length ? <ul className="mt-2 flex flex-wrap gap-2">{query.data.registrations!.filter(Boolean).map((item, index) => <li key={`${item?.country}-${item?.subdivision}-${index}`} className="rounded-lg border border-line px-3 py-2 text-sm">{item?.country || 'Unknown country'}{item?.subdivision ? ` · ${item.subdivision}` : ''}{item?.registrationNumber ? ` · ${item.registrationNumber}` : ''}</li>)}</ul> : <p className="mt-2 text-sm text-ink-muted">No tax registrations on file.</p>}</div>
        <div><h3 className="text-sm font-semibold">Tax exemptions</h3>{exemptions.length ? <div className="mt-2 space-y-2">{exemptions.map((item, index) => <div key={`${item.country}-${item.subdivision}-${index}`} className="flex flex-wrap items-center gap-3 rounded-lg border border-line px-3 py-2.5"><div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.country || 'Unknown country'}{item.subdivision ? ` · ${item.subdivision}` : ''}</p><p className="text-xs text-ink-muted">{item.status || 'Status unavailable'}</p></div>{item.status === 'pending' && <><Button size="sm" variant="outline" disabled={review.isPending} onClick={() => { setReviewing(`${index}:approved`); review.mutate({ country: item.country || '', ...(item.subdivision ? { subdivision: item.subdivision } : {}), status: 'approved' }) }}>Approve</Button><Button size="sm" variant="destructive" disabled={review.isPending} onClick={() => { setReviewing(`${index}:rejected`); review.mutate({ country: item.country || '', ...(item.subdivision ? { subdivision: item.subdivision } : {}), status: 'rejected' }) }}>Reject</Button></>}{review.isPending && reviewing?.startsWith(`${index}:`) && <span className="text-xs text-ink-muted">Saving…</span>}</div>)}</div> : <p className="mt-2 text-sm text-ink-muted">No tax exemptions on file.</p>}{review.isError && <div className="mt-3"><ErrorMessage>{review.error.message}</ErrorMessage></div>}</div>
      </div>}
      {!query.isLoading && !query.isError && lookupId && !query.data && <p role="status" className="mt-5 text-sm text-ink-muted">No commerce profile data was returned for this organization.</p>}
    </CardContent></Card>
  </section>
}

export function AccountsOrganizationUsersPage() {
  const { session } = useAuth()
  const [organizationId, setOrganizationId] = useState('')
  const [lookupId, setLookupId] = useState('')
  const organizationsQuery = useQuery({ queryKey: ['qk-admin-organizations'], queryFn: () => listAdminOrganizations(session!.token), enabled: Boolean(session?.token) })
  const membersQuery = useQuery({ queryKey: ['qk-admin-organization-members', lookupId], queryFn: () => listOrganizationMembers(session!.token, lookupId), enabled: Boolean(session?.token && lookupId) })
  const organizations = organizationsQuery.data?.organizations ?? []
  const members = membersQuery.data?.members ?? []
  function submitLookup(event: FormEvent) { event.preventDefault(); setLookupId(organizationId.trim()) }
  return <section className="space-y-6"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Accounts</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Organization users</h1><p className="mt-2 max-w-2xl text-sm text-ink-muted">View members belonging to an organization.</p></div>
    <Card><CardHeader><CardTitle>Organization member roster</CardTitle><p data-slot="card-description" className="text-sm text-ink-muted">Select an organization or enter its ID to load its members.</p></CardHeader><CardContent><form className="flex flex-col gap-2 sm:flex-row" onSubmit={submitLookup}><label htmlFor="member-org-id" className="sr-only">Organization</label><select id="member-org-id" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className="h-10 rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand sm:max-w-md"><option value="">Choose an organization</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name || organization.slug || organization.id}</option>)}</select><Input aria-label="Organization ID" placeholder="Or enter organization ID" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className="sm:max-w-md" /><Button type="submit" disabled={!organizationId.trim()}>Load members</Button></form>
      {organizationsQuery.isError && <div className="mt-4"><ErrorMessage>{organizationsQuery.error.message}</ErrorMessage></div>}
      {membersQuery.isLoading && <p className="mt-5 text-sm text-ink-muted">Loading organization members…</p>}{membersQuery.isError && <div className="mt-4"><ErrorMessage>{membersQuery.error.message}</ErrorMessage></div>}
      {membersQuery.isSuccess && <div className="mt-5 overflow-x-auto border-t border-line pt-5"><Table aria-label="Organization members"><TableHeader><TableRow><TableHead className="border-r border-line">Member</TableHead><TableHead className="border-r border-line">Contact</TableHead><TableHead>Role</TableHead></TableRow></TableHeader><TableBody>{members.length ? members.map((member, index) => <TableRow key={member.id || member.userId || member.accountId || index}><TableCell className="border-r border-line"><Identity name={member.name || member.email || member.userId || member.accountId || member.id || 'Unnamed member'} secondary={member.status || member.id || member.userId || member.accountId || 'Organization member'} /></TableCell><TableCell className="border-r border-line">{member.email || member.phone || 'No contact details'}</TableCell><TableCell>{member.role || 'Member'}</TableCell></TableRow>) : <TableRow><TableCell colSpan={3} className="h-28 text-center text-sm text-ink-muted">No members found for this organization.</TableCell></TableRow>}</TableBody></Table></div>}
    </CardContent></Card>
  </section>
}
