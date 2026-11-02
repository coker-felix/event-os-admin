import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuth } from '@/contexts/auth'
import { addOrganizationCapability, getAdminOrganization } from '@/services/admin-organizations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OrganizationMembers } from '@/components/accounts/organizations/organization-members'
import { OrganizationKYB } from '@/components/accounts/organizations/organization-kyb'
import { OrganizationVendorProfiles } from '@/components/accounts/organizations/organization-vendor-profiles'

export const Route = createFileRoute('/app/_dashboard/accounts/organizations/$orgId')({ component: OrganizationDetailPage })

function OrganizationDetailPage() {
  const { orgId } = Route.useParams()
  const { session } = useAuth()
  const client = useQueryClient()
  const [capability, setCapability] = useState<'organize' | 'vend' | 'host'>('organize')
  const [reason, setReason] = useState('')
  const [idempotencyKey, setIdempotencyKey] = useState('')
  const query = useQuery({ queryKey: ['admin-organization', orgId], queryFn: () => getAdminOrganization(session!.token, orgId), enabled: Boolean(session?.token) })
  const org = query.data?.organization
  const addCapability = useMutation({ mutationFn: (key: string) => addOrganizationCapability(session!.token, orgId, { capability, reason: reason.trim(), idempotencyKey: key }), onSuccess: async () => { sessionStorage.removeItem(`admin-add-capability:${orgId}:${capability}`); setIdempotencyKey(''); setReason(''); await client.invalidateQueries({ queryKey: ['admin-organization', orgId] }) } })
  const availableCapabilities = (['organize', 'vend', 'host'] as const).filter((value) => !(org?.capabilities ?? []).some((item) => item?.capability === value))
  const submitCapability = (event: React.FormEvent) => { event.preventDefault(); const key = idempotencyKey || sessionStorage.getItem(`admin-add-capability:${orgId}:${capability}`) || crypto.randomUUID(); setIdempotencyKey(key); sessionStorage.setItem(`admin-add-capability:${orgId}:${capability}`, key); addCapability.mutate(key) }
  return <section className="mx-auto max-w-4xl space-y-6">
    <header><h1 className="text-xl font-semibold tracking-tight">{org?.name || 'Organization'}</h1><p className="mt-1 break-all text-xs text-ink-muted">{orgId}</p></header>
    {query.isLoading ? <p className="py-8 text-center text-sm text-ink-muted">Loading organization…</p> : query.isError ? <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{query.error.message}</p> : org ? <>
      <Card><CardHeader><CardTitle>Capabilities and KYB</CardTitle></CardHeader><CardContent className="space-y-3">{(org.capabilities ?? []).map((item) => item && <div key={item.capability} className="flex items-center justify-between rounded-lg border border-line p-3 text-sm"><span>{item.capability}</span><span className="text-ink-muted">{item.status || 'pending'} · KYB {item.kybStatus || 'pending'}</span></div>)}{availableCapabilities.length > 0 && <form className="grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_1fr_auto]" onSubmit={submitCapability}><label className="space-y-1.5 text-sm font-medium">Add capability<select aria-label="Add capability" value={capability} onChange={(event) => { const next = event.target.value as typeof capability; setCapability(next); setIdempotencyKey('') }} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm">{availableCapabilities.map((value) => <option key={value}>{value}</option>)}</select></label><label className="space-y-1.5 text-sm font-medium">Reason<Input required value={reason} onChange={(event) => setReason(event.target.value)} /></label><div className="flex items-end"><Button type="submit" disabled={addCapability.isPending || !reason.trim()}>{addCapability.isPending ? 'Adding…' : 'Add'}</Button></div>{addCapability.isError && <p role="alert" className="text-sm text-danger sm:col-span-3">{addCapability.error.message} Retry with the same key to replay safely.</p>}</form>}</CardContent></Card>
      <OrganizationKYB organizationId={orgId} capabilities={org.capabilities ?? []} />
      <OrganizationMembers organizationId={orgId} ownerId={org.ownerId} capabilities={org.capabilities ?? []} />
      <OrganizationVendorProfiles organizationId={orgId} enabled={(org.capabilities ?? []).some((item) => item?.capability === 'vend' && item.status === 'active' && item.kybStatus === 'approved')} />
    </> : <p className="text-sm text-ink-muted">No organization details were returned.</p>}
  </section>
}
