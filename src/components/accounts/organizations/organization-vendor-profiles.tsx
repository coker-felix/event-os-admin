import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import {
  createOrganizationVendorProfile,
  deactivateOrganizationVendorProfile,
  listOrganizationVendorProfiles,
  listOrganizationVendorServiceAreas,
  replaceOrganizationVendorServiceAreas,
  updateOrganizationVendorProfile,
  type OrganizationVendorProfile,
  type OrganizationVendorServiceArea,
} from '@/services/admin-organizations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function OrganizationVendorProfiles({ organizationId, enabled }: { organizationId: string; enabled: boolean }) {
  const { session } = useAuth()
  const client = useQueryClient()
  const [accountId, setAccountId] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [category, setCategory] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [description, setDescription] = useState('')
  const [editingProfile, setEditingProfile] = useState(false)
  const [selected, setSelected] = useState('')
  const [areasText, setAreasText] = useState<string | null>(null)
  const profiles = useQuery({ queryKey: ['admin-org-vendor-profiles', organizationId], queryFn: () => listOrganizationVendorProfiles(session!.token, organizationId), enabled: Boolean(session?.token && enabled) })
  const saveProfile = useMutation({ mutationFn: () => editingProfile && selected
    ? updateOrganizationVendorProfile(session!.token, organizationId, selected, { businessName: businessName.trim(), contactName: contactName.trim(), email: email.trim(), phone: phone.trim(), category: category.trim(), city: city.trim(), country: country.trim(), description: description.trim() })
    : createOrganizationVendorProfile(session!.token, organizationId, { accountId: accountId.trim(), businessName: businessName.trim(), email: email.trim() || undefined, contactName: contactName.trim(), phone: phone.trim(), category: category.trim(), city: city.trim(), country: country.trim() }),
    onSuccess: async (profile) => { setAccountId(''); setEditingProfile(false); setSelected(profile.id); await client.invalidateQueries({ queryKey: ['admin-org-vendor-profiles', organizationId] }) } })
  const deactivate = useMutation({ mutationFn: ({ vendorId, reason }: { vendorId: string; reason: string }) => deactivateOrganizationVendorProfile(session!.token, organizationId, vendorId, reason), onSuccess: async () => { await client.invalidateQueries({ queryKey: ['admin-org-vendor-profiles', organizationId] }) } })
  const serviceAreas = useQuery({ queryKey: ['admin-vendor-service-areas', organizationId, selected], queryFn: () => listOrganizationVendorServiceAreas(session!.token, organizationId, selected), enabled: Boolean(session?.token && enabled && selected) })
  const saveAreas = useMutation({ mutationFn: (areas: Array<Pick<OrganizationVendorServiceArea, 'countryCode' | 'regionCode' | 'locality'>>) => replaceOrganizationVendorServiceAreas(session!.token, organizationId, selected, areas), onSuccess: async () => { setAreasText(null); await client.invalidateQueries({ queryKey: ['admin-vendor-service-areas', organizationId, selected] }); await client.invalidateQueries({ queryKey: ['admin-org-vendor-profiles', organizationId] }) } })
  const vendors = profiles.data?.vendors ?? []
  const activeProfile = useMemo(() => vendors.find((vendor) => vendor.id === selected), [vendors, selected])
  const submitAreas = (event: React.FormEvent) => {
    event.preventDefault()
    const source = areasText ?? currentAreas.map((area) => [area.countryCode, area.regionCode, area.locality].join(', ')).join('\n')
    const parsed = source.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      const [countryCode, regionCode = '', locality = ''] = line.split(',').map((part) => part.trim())
      return { countryCode, regionCode, locality }
    })
    saveAreas.mutate(parsed)
  }
  const currentAreas = serviceAreas.data?.serviceAreas ?? []
  return <Card>
    <CardHeader><CardTitle>Vendor profiles</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      {!enabled && <p className="text-sm text-ink-muted">Approve KYB and activate the vend capability to manage vendor profiles.</p>}
      {profiles.isLoading && <p className="text-sm text-ink-muted">Loading profiles…</p>}
      {profiles.isError && <p role="alert" className="text-sm text-danger">{profiles.error.message}</p>}
      {!profiles.isLoading && !profiles.isError && vendors.length === 0 && <p className="text-sm text-ink-muted">No vendor profiles for this organization yet.</p>}
      {vendors.length > 0 && <div className="grid gap-2 sm:grid-cols-2">{vendors.map((vendor) => <ProfileCard key={vendor.id} vendor={vendor} selected={selected === vendor.id} onSelect={() => { setSelected(vendor.id); setAreasText(null); setEditingProfile(false); setBusinessName(vendor.businessName); setContactName(vendor.contactName ?? ''); setEmail(vendor.email ?? ''); setPhone(vendor.phone ?? ''); setCategory(vendor.category ?? ''); setCity(vendor.city ?? ''); setCountry(vendor.country ?? '') }} />)}</div>}
      {enabled && activeProfile && !editingProfile && <Button type="button" variant="outline" onClick={() => { setSelected(''); setAccountId(''); setBusinessName(''); setContactName(''); setEmail(''); setPhone(''); setCategory(''); setCity(''); setCountry(''); setDescription('') }}>Create another profile</Button>}
      {enabled && (editingProfile || !activeProfile) && <form className="grid gap-3 border-t border-line pt-4 sm:grid-cols-3" onSubmit={(event) => { event.preventDefault(); saveProfile.mutate() }}>
        {!editingProfile && <label className="space-y-1 text-xs font-medium">Contact user UUID<Input required value={accountId} onChange={(event) => setAccountId(event.target.value)} /></label>}
        <label className="space-y-1 text-xs font-medium">Business name<Input required value={businessName} onChange={(event) => setBusinessName(event.target.value)} /></label>
        <label className="space-y-1 text-xs font-medium">Contact name<Input value={contactName} onChange={(event) => setContactName(event.target.value)} /></label>
        <label className="space-y-1 text-xs font-medium">Contact email<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="space-y-1 text-xs font-medium">Contact phone<Input value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
        <label className="space-y-1 text-xs font-medium">Category<Input value={category} onChange={(event) => setCategory(event.target.value)} /></label>
        <label className="space-y-1 text-xs font-medium">City<Input value={city} onChange={(event) => setCity(event.target.value)} /></label>
        <label className="space-y-1 text-xs font-medium">Country<Input value={country} onChange={(event) => setCountry(event.target.value)} /></label>
        <label className="space-y-1 text-xs font-medium sm:col-span-2">Description<textarea className="min-h-10 w-full rounded-md border border-line bg-surface p-2 text-sm" value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        <div className="flex items-end gap-2"><Button type="submit" disabled={saveProfile.isPending}>{saveProfile.isPending ? 'Saving…' : editingProfile ? 'Save profile' : 'Create profile'}</Button>{editingProfile && <Button type="button" variant="outline" onClick={() => setEditingProfile(false)}>Cancel</Button>}</div>
        {saveProfile.isError && <p role="alert" className="text-sm text-danger sm:col-span-3">{saveProfile.error.message}</p>}
      </form>}
      {activeProfile && <section className="space-y-3 rounded-lg border border-line p-4">
        <div className="flex items-start justify-between gap-3"><div><h3 className="font-medium">{activeProfile.businessName} service areas</h3><p className="text-xs text-ink-muted">One area per line: country code, region code, locality. Maximum 50.</p></div><div className="flex gap-2"><Button type="button" variant="outline" disabled={!enabled || activeProfile.status === 'deactivated'} onClick={() => { setEditingProfile(true); setBusinessName(activeProfile.businessName); setContactName(activeProfile.contactName ?? ''); setEmail(activeProfile.email ?? ''); setPhone(activeProfile.phone ?? ''); setCategory(activeProfile.category ?? ''); setCity(activeProfile.city ?? ''); setCountry(activeProfile.country ?? ''); setDescription(activeProfile.description ?? '') }}>Edit profile</Button>{activeProfile.status !== 'deactivated' && <Button type="button" variant="outline" disabled={!enabled || deactivate.isPending} onClick={() => { const reason = window.prompt(`Reason for deactivating ${activeProfile.businessName}`); if (reason?.trim()) deactivate.mutate({ vendorId: activeProfile.id, reason }) }}>Deactivate</Button>}</div></div>
        {deactivate.isError && <p role="alert" className="text-sm text-danger">{deactivate.error.message}</p>}
        {activeProfile.status === 'deactivated' && <p className="text-sm text-ink-muted">This deactivated profile is read-only.</p>}
        {serviceAreas.isLoading ? <p className="text-sm text-ink-muted">Loading service areas…</p> : serviceAreas.isError ? <p role="alert" className="text-sm text-danger">{serviceAreas.error.message}</p> : activeProfile.status !== 'deactivated' && <form className="space-y-3" onSubmit={submitAreas}>
          <textarea aria-label="Regional service areas" className="min-h-28 w-full rounded-md border border-line bg-surface p-3 text-sm" placeholder={'GH, Greater Accra, Accra\nNG, Lagos, Lagos'} value={areasText ?? currentAreas.map((area) => [area.countryCode, area.regionCode, area.locality].join(', ')).join('\n')} onChange={(event) => setAreasText(event.target.value)} />
          <Button type="submit" disabled={saveAreas.isPending}>{saveAreas.isPending ? 'Saving…' : 'Replace service areas'}</Button>
          {saveAreas.isError && <p role="alert" className="text-sm text-danger">{saveAreas.error.message}</p>}
          {saveAreas.isSuccess && <p role="status" className="text-sm text-success">Service areas saved.</p>}
        </form>}
        <div className="border-t border-line pt-3"><h4 className="text-sm font-medium">Profile stats</h4><p className="text-sm text-ink-muted">{activeProfile.profileStats ? `${activeProfile.profileStats.averageRating.toFixed(1)} rating · ${activeProfile.profileStats.ratingCount} reviews · ${activeProfile.profileStats.completedBookingCount} completed bookings` : 'Stats are not available yet.'}</p><p className="text-xs text-ink-muted">Derived by Vendors service; read-only.</p></div>
      </section>}
    </CardContent>
  </Card>
}

function ProfileCard({ vendor, selected, onSelect }: { vendor: OrganizationVendorProfile; selected: boolean; onSelect: () => void }) {
  return <button type="button" onClick={onSelect} aria-pressed={selected} className={`rounded-lg border p-3 text-left ${selected ? 'border-brand-600 bg-brand-50' : 'border-line'}`}><span className="block font-medium">{vendor.businessName}</span><span className="block text-xs text-ink-muted">{vendor.status} · {vendor.category || 'Uncategorized'}</span></button>
}
