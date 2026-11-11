import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuth } from '@/contexts/auth'
import type { AdminOrganization } from '@/services/admin-account-directory'
import { organizationSocialNetworks, setAdminOrganizationStatus, updateAdminOrganization, uploadOrganizationLogo } from '@/services/admin-organizations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { listCountries } from '@/services/admin-platform'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'

export function OrganizationOverview({ organization }: { organization: AdminOrganization }) {
  const { session } = useAuth()
  const client = useQueryClient()
  const organizationId = organization.id
  const [logoUrl, setLogoUrl] = useState(organization.logoUrl ?? '')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [reason, setReason] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const countriesQuery = useQuery({ queryKey: ['qk-admin-platform-countries'], queryFn: () => listCountries(session!.token), enabled: Boolean(session?.token) })
  const update = useMutation({
    mutationFn: (input: Parameters<typeof updateAdminOrganization>[2]) => updateAdminOrganization(session!.token, organizationId, input),
    onSuccess: async () => { setEditOpen(false); await Promise.all([client.invalidateQueries({ queryKey: ['admin-organization', organizationId] }), client.invalidateQueries({ queryKey: ['qk-admin-organizations'] })]) },
  })
  const uploadLogo = useMutation({
    mutationFn: ({ file, auditReason }: { file: File; auditReason: string }) => uploadOrganizationLogo(session!.token, organizationId, file, auditReason),
    onSuccess: async (updated) => { setLogoUrl(updated.logoUrl ?? ''); setLogoFile(null); await Promise.all([client.invalidateQueries({ queryKey: ['admin-organization', organizationId] }), client.invalidateQueries({ queryKey: ['qk-admin-organizations'] })]) },
  })
  const setStatus = useMutation({
    mutationFn: ({ status, reason }: { status: 'active' | 'suspended'; reason: string }) => setAdminOrganizationStatus(session!.token, organizationId, status, reason),
    onSuccess: async () => Promise.all([client.invalidateQueries({ queryKey: ['admin-organization', organizationId] }), client.invalidateQueries({ queryKey: ['qk-admin-organizations'] })]),
  })
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const reason = String(form.get('reason') || '').trim()
    if (!reason) return
    const socialLinks = Object.fromEntries(organizationSocialNetworks.map((network) => [network, String(form.get(`social-${network}`) || '').trim()]).filter(([, url]) => url))
    update.mutate({
      name: String(form.get('name') || ''), email: String(form.get('email') || ''), phone: String(form.get('phone') || ''), address: String(form.get('address') || ''),
      countryCode: String(form.get('countryCode') || ''), description: String(form.get('description') || ''), logoUrl, websiteUrl: String(form.get('websiteUrl') || ''), socialLinks, reason,
    })
  }
  const onStatus = () => {
    const status = organization.status === 'suspended' ? 'active' : 'suspended'
    if (!window.confirm(`${status === 'suspended' ? 'Suspend' : 'Reactivate'} this organization?`)) return
    const reason = window.prompt('Reason for this status change')?.trim()
    if (reason) setStatus.mutate({ status, reason })
  }

  return <>
    <Card><CardHeader className="flex flex-row items-center justify-between gap-3"><CardTitle>Organization details · {organization.status || 'active'}</CardTitle><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setEditOpen(true)}>Edit organization</Button><Button type="button" variant="outline" disabled={setStatus.isPending} onClick={onStatus}>{setStatus.isPending ? 'Saving…' : organization.status === 'suspended' ? 'Reactivate organization' : 'Suspend organization'}</Button></div></CardHeader><CardContent><dl className="grid gap-x-5 gap-y-3 text-sm sm:grid-cols-2"><dt className="text-ink-muted">Email</dt><dd>{organization.email || '—'}</dd><dt className="text-ink-muted">Phone</dt><dd>{organization.phone || '—'}</dd><dt className="text-ink-muted">Address</dt><dd>{organization.address || '—'}</dd><dt className="text-ink-muted">Website</dt><dd>{organization.websiteUrl || '—'}</dd></dl></CardContent></Card>
    <Sheet open={editOpen} onOpenChange={setEditOpen}><SheetContent className="w-full overflow-y-auto sm:max-w-2xl"><SheetHeader><SheetTitle>Edit organization</SheetTitle><SheetDescription>Update contact and business details for {organization.name || 'this organization'}.</SheetDescription></SheetHeader>
    <form id="edit-organization-overview" className="flex-1 space-y-3 overflow-y-auto px-6 pb-6" onSubmit={onSubmit}>
      <label className="space-y-1.5 text-sm font-medium">Organization name<Input name="name" required defaultValue={organization.name || ''} /></label>
      <label className="space-y-1.5 text-sm font-medium">Country<select name="countryCode" required defaultValue={organization.countryCode || ''} disabled={countriesQuery.isLoading || countriesQuery.isError} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"><option value="">Choose a country</option>{(countriesQuery.data?.countries ?? []).filter((country) => country.enabled).map((country) => <option key={country.code} value={country.code}>{country.name} ({country.code})</option>)}</select></label>
      <label className="space-y-1.5 text-sm font-medium">Email<Input name="email" type="email" defaultValue={organization.email || ''} /></label>
      <label className="space-y-1.5 text-sm font-medium">Phone<Input name="phone" defaultValue={organization.phone || ''} /></label>
      <label className="space-y-1.5 text-sm font-medium">Address<Input name="address" defaultValue={organization.address || ''} /></label>
      <label className="space-y-1.5 text-sm font-medium sm:col-span-2">About / description<textarea name="description" maxLength={2000} defaultValue={organization.description || ''} rows={4} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm" /></label>
      <div className="space-y-2"><span className="block text-sm font-medium">Organization logo</span><div className="flex items-center gap-3">{logoUrl ? <img src={logoUrl} alt={organization.name ? `${organization.name} logo` : 'Organization logo'} referrerPolicy="no-referrer" className="h-12 w-12 rounded-lg border border-line bg-surface object-contain p-1" /> : <span className="grid h-12 w-12 place-items-center rounded-lg border border-line text-xs text-ink-muted">No logo</span>}<Input type="file" accept="image/png,image/jpeg" onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)} /></div><p className="text-xs text-ink-muted">PNG or JPEG, up to 5 MiB. {logoFile?.name || ''}</p><Button type="button" size="sm" variant="outline" disabled={!logoFile || !reason.trim() || uploadLogo.isPending} onClick={() => logoFile && uploadLogo.mutate({ file: logoFile, auditReason: reason.trim() })}>{uploadLogo.isPending ? 'Uploading…' : 'Upload logo'}</Button></div>
      <label className="space-y-1.5 text-sm font-medium">Website URL<Input name="websiteUrl" type="url" placeholder="https://example.com" defaultValue={organization.websiteUrl || ''} /></label>
      {organizationSocialNetworks.map((network) => <label key={network} className="space-y-1.5 text-sm font-medium">{network === 'x' ? 'X' : network[0].toUpperCase() + network.slice(1)}<Input name={`social-${network}`} type="url" placeholder="https://" defaultValue={organization.socialLinks?.[network] || ''} /></label>)}
      <label className="space-y-1.5 text-sm font-medium sm:col-span-2">Reason for edit<Input name="reason" required value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      {(update.isError || setStatus.isError || uploadLogo.isError || countriesQuery.isError) && <p role="alert" className="text-sm text-danger sm:col-span-2">{update.error?.message || setStatus.error?.message || uploadLogo.error?.message || countriesQuery.error?.message}</p>}
    </form><SheetFooter className="border-t border-line"><Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button type="submit" form="edit-organization-overview" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save organization'}</Button></SheetFooter></SheetContent></Sheet>
  </>
}
