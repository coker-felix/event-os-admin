import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuth } from '@/contexts/auth'
import type { AdminOrganization } from '@/services/admin-account-directory'
import { organizationSocialNetworks, setAdminOrganizationStatus, updateAdminOrganization, uploadOrganizationLogo } from '@/services/admin-organizations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { listCountries } from '@/services/admin-platform'

export function OrganizationOverview({ organization }: { organization: AdminOrganization }) {
  const { session } = useAuth()
  const client = useQueryClient()
  const organizationId = organization.id
  const [logoUrl, setLogoUrl] = useState(organization.logoUrl ?? '')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [reason, setReason] = useState('')
  const countriesQuery = useQuery({ queryKey: ['qk-admin-platform-countries'], queryFn: () => listCountries(session!.token), enabled: Boolean(session?.token) })
  const update = useMutation({
    mutationFn: (input: Parameters<typeof updateAdminOrganization>[2]) => updateAdminOrganization(session!.token, organizationId, input),
    onSuccess: async () => Promise.all([client.invalidateQueries({ queryKey: ['admin-organization', organizationId] }), client.invalidateQueries({ queryKey: ['qk-admin-organizations'] })]),
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

  return <Card><CardHeader><CardTitle>Organization details · {organization.status || 'active'}</CardTitle></CardHeader><CardContent className="space-y-4">
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
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
      <div className="flex flex-wrap gap-2 sm:col-span-2"><Button type="submit" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save organization'}</Button><Button type="button" variant="outline" disabled={setStatus.isPending} onClick={onStatus}>{setStatus.isPending ? 'Saving…' : organization.status === 'suspended' ? 'Reactivate organization' : 'Suspend organization'}</Button></div>
      {(update.isError || setStatus.isError || uploadLogo.isError || countriesQuery.isError) && <p role="alert" className="text-sm text-danger sm:col-span-2">{update.error?.message || setStatus.error?.message || uploadLogo.error?.message || countriesQuery.error?.message}</p>}
    </form>
  </CardContent></Card>
}
