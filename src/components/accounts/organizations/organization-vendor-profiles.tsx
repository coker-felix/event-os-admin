import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import {
  createOrganizationVendorProfile,
  listOrganizationVendorProfiles,
  listOrganizationVendorServiceAreas,
  replaceOrganizationVendorServiceAreas,
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
  const [selected, setSelected] = useState('')
  const [areasText, setAreasText] = useState<string | null>(null)
  const profiles = useQuery({ queryKey: ['admin-org-vendor-profiles', organizationId], queryFn: () => listOrganizationVendorProfiles(session!.token, organizationId), enabled: Boolean(session?.token && enabled) })
  const create = useMutation({ mutationFn: () => createOrganizationVendorProfile(session!.token, organizationId, { accountId: accountId.trim(), businessName: businessName.trim(), email: email.trim() || undefined }), onSuccess: async (profile) => { setAccountId(''); setBusinessName(''); setEmail(''); setSelected(profile.id); await client.invalidateQueries({ queryKey: ['admin-org-vendor-profiles', organizationId] }) } })
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
      {vendors.length > 0 && <div className="grid gap-2 sm:grid-cols-2">{vendors.map((vendor) => <ProfileCard key={vendor.id} vendor={vendor} selected={selected === vendor.id} onSelect={() => { setSelected(vendor.id); setAreasText('') }} />)}</div>}
      {enabled && <form className="grid gap-3 border-t border-line pt-4 sm:grid-cols-3" onSubmit={(event) => { event.preventDefault(); create.mutate() }}>
        <label className="space-y-1 text-xs font-medium">Contact user UUID<Input required value={accountId} onChange={(event) => setAccountId(event.target.value)} /></label>
        <label className="space-y-1 text-xs font-medium">Business name<Input required value={businessName} onChange={(event) => setBusinessName(event.target.value)} /></label>
        <label className="space-y-1 text-xs font-medium">Contact email<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <div className="sm:col-span-3"><Button type="submit" disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Create profile'}</Button>{create.isError && <p role="alert" className="mt-2 text-sm text-danger">{create.error.message}</p>}</div>
      </form>}
      {activeProfile && <section className="space-y-3 rounded-lg border border-line p-4">
        <div><h3 className="font-medium">{activeProfile.businessName} service areas</h3><p className="text-xs text-ink-muted">One area per line: country code, region code, locality. Maximum 50.</p></div>
        {serviceAreas.isLoading ? <p className="text-sm text-ink-muted">Loading service areas…</p> : serviceAreas.isError ? <p role="alert" className="text-sm text-danger">{serviceAreas.error.message}</p> : <form className="space-y-3" onSubmit={submitAreas}>
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
