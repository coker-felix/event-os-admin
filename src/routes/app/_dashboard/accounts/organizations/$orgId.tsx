import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuth } from '@/contexts/auth'
import { addOrganizationCapability, getAdminOrganization } from '@/services/admin-organizations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OrganizationOverview } from '@/components/accounts/organizations/organization-overview'
import { OrganizationMembers } from '@/components/accounts/organizations/organization-members'
import { OrganizationKYB } from '@/components/accounts/organizations/organization-kyb'
import { OrganizationVendorProfiles } from '@/components/accounts/organizations/organization-vendor-profiles'
import { OrganizationVenues } from '@/components/accounts/organizations/organization-venues'
import { OrganizationCallouts } from '@/components/accounts/organizations/organization-callouts'

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
  const addCapability = useMutation({
    mutationFn: (key: string) => addOrganizationCapability(session!.token, orgId, { capability, reason: reason.trim(), idempotencyKey: key }),
    onSuccess: async () => {
      sessionStorage.removeItem(`admin-add-capability:${orgId}:${capability}`)
      setIdempotencyKey('')
      setReason('')
      await client.invalidateQueries({ queryKey: ['admin-organization', orgId] })
    },
  })
  const availableCapabilities = (['organize', 'vend', 'host'] as const).filter((value) => !(org?.capabilities ?? []).some((item) => item?.capability === value))
  const submitCapability = (event: React.FormEvent) => {
    event.preventDefault()
    const key = idempotencyKey || sessionStorage.getItem(`admin-add-capability:${orgId}:${capability}`) || crypto.randomUUID()
    setIdempotencyKey(key)
    sessionStorage.setItem(`admin-add-capability:${orgId}:${capability}`, key)
    addCapability.mutate(key)
  }

  return (
    <section className="mx-auto max-w-6xl space-y-5">
      <Link
        to="/app/accounts/organizations"
        className="inline-flex text-sm font-medium text-ink-muted transition-colors hover:text-ink"
      >
        ← Organizations
      </Link>

      {query.isLoading ? (
        <p className="py-8 text-center text-sm text-ink-muted">Loading organization…</p>
      ) : query.isError ? (
        <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{query.error.message}</p>
      ) : org ? (
        <>
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {org.logoUrl ? <img src={org.logoUrl} alt={`${org.name || 'Organization'} logo`} referrerPolicy="no-referrer" className="h-12 w-12 shrink-0 rounded-lg border border-line bg-surface object-contain p-1" /> : <div aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-line bg-surface text-sm font-semibold text-ink-muted">{(org.name || 'O').slice(0, 1).toUpperCase()}</div>}
              <div className="min-w-0">
                <h1 className="break-words text-2xl font-semibold tracking-tight">{org.name || 'Organization'}</h1>
                <p className="mt-1 break-all text-xs text-ink-muted">{orgId}</p>
              </div>
            </div>
            <Badge className={org.status === 'active' ? 'bg-success-soft text-success' : ''} variant={org.status === 'active' ? 'default' : 'outline'}>
              {org.status || 'Unknown status'}
            </Badge>
          </header>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl p-1">
              <TabsTrigger value="overview" className="flex-none px-4">Overview</TabsTrigger>
              <TabsTrigger value="capabilities" className="flex-none px-4">Capabilities</TabsTrigger>
              <TabsTrigger value="verification" className="flex-none px-4">Verification</TabsTrigger>
              <TabsTrigger value="members" className="flex-none px-4">Members</TabsTrigger>
              <TabsTrigger value="vendors" className="flex-none px-4">Vendor profiles</TabsTrigger>
              <TabsTrigger value="venues" className="flex-none px-4">Venues</TabsTrigger>
              <TabsTrigger value="callouts" className="flex-none px-4">Callouts</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-0">
              <OrganizationOverview organization={org} />
            </TabsContent>

            <TabsContent value="capabilities" className="mt-0">
              <Card>
                <CardHeader><CardTitle>Organization capabilities</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {(org.capabilities ?? []).map((item) => item && (
                    <div key={item.capability} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3 text-sm">
                      <span className="font-medium">{item.capability}</span>
                      <span className="text-ink-muted">{item.status || 'pending'} · KYB {item.kybStatus || 'pending'}</span>
                    </div>
                  ))}
                  {availableCapabilities.length === 0 && <p className="text-sm text-ink-muted">This organization has all available capabilities.</p>}
                  {availableCapabilities.length > 0 && (
                    <form className="grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_1fr_auto]" onSubmit={submitCapability}>
                      <label className="space-y-1.5 text-sm font-medium">
                        Add capability
                        <select aria-label="Add capability" value={capability} onChange={(event) => { const next = event.target.value as typeof capability; setCapability(next); setIdempotencyKey('') }} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm">
                          {availableCapabilities.map((value) => <option key={value} value={value}>{value}</option>)}
                        </select>
                      </label>
                      <label className="space-y-1.5 text-sm font-medium">Reason<Input required value={reason} onChange={(event) => setReason(event.target.value)} /></label>
                      <div className="flex items-end"><Button type="submit" disabled={addCapability.isPending || !reason.trim()}>{addCapability.isPending ? 'Adding…' : 'Add capability'}</Button></div>
                      {addCapability.isError && <p role="alert" className="text-sm text-danger sm:col-span-3">{addCapability.error.message} Retry with the same key to replay safely.</p>}
                    </form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="verification" className="mt-0">
              <OrganizationKYB organizationId={orgId} capabilities={org.capabilities ?? []} />
            </TabsContent>

            <TabsContent value="members" className="mt-0">
              <OrganizationMembers organizationId={orgId} ownerId={org.ownerId} capabilities={org.capabilities ?? []} />
            </TabsContent>

            <TabsContent value="vendors" className="mt-0">
              <OrganizationVendorProfiles organizationId={orgId} enabled={(org.capabilities ?? []).some((item) => item?.capability === 'vend' && item.status === 'active' && item.kybStatus === 'approved')} />
            </TabsContent>

            <TabsContent value="venues" className="mt-0">
              <OrganizationVenues organizationId={orgId} enabled={(org.capabilities ?? []).some((item) => item?.capability === 'host' && item.status === 'active' && item.kybStatus === 'approved')} />
            </TabsContent>

            <TabsContent value="callouts" className="mt-0">
              <OrganizationCallouts organizationId={orgId} enabled={(org.capabilities ?? []).some((item) => item?.capability === 'organize' && item.status === 'active' && item.kybStatus === 'approved')} />
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <p className="text-sm text-ink-muted">No organization details were returned.</p>
      )}
    </section>
  )
}
