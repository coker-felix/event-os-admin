import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { clearOrganizationFeatureFlag, getOrganizationFeatureFlags, setOrganizationFeatureFlag } from '@/services/admin-feature-flags'

const organizationFlagsKey = (organizationId: string) => ['qk-admin-org-feature-flags', organizationId] as const

export function OrganizationFeatureFlagsCard({ organizationId }: { organizationId: string }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const queryKey = organizationFlagsKey(organizationId)
  const flagsQuery = useQuery({
    queryKey,
    queryFn: () => getOrganizationFeatureFlags(session!.token, organizationId),
    enabled: Boolean(session?.token && organizationId),
  })
  const setOverride = useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) => setOrganizationFeatureFlag(session!.token, organizationId, name, enabled),
    onSuccess: (data) => queryClient.setQueryData(queryKey, data),
  })
  const clearOverride = useMutation({
    mutationFn: (name: string) => clearOrganizationFeatureFlag(session!.token, organizationId, name),
    onSuccess: (data) => queryClient.setQueryData(queryKey, data),
  })
  const mutationError = setOverride.error ?? clearOverride.error

  return <Card className="xl:col-span-2">
    <CardHeader>
      <CardTitle>Feature flag overrides</CardTitle>
      <p className="text-sm text-ink-muted">Set an organization-specific value, or clear an override to use the platform default.</p>
    </CardHeader>
    <CardContent>
      {flagsQuery.isLoading ? <p className="py-5 text-center text-sm text-ink-muted">Loading organization feature flags…</p>
        : flagsQuery.isError ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/20 bg-danger-soft px-3 py-3 text-sm text-danger"><span>Could not load organization feature flags: {flagsQuery.error.message}</span><Button type="button" variant="outline" size="sm" onClick={() => void flagsQuery.refetch()}>Try again</Button></div>
          : <>
            {mutationError && <p role="alert" className="mb-3 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">{mutationError.message}</p>}
            {(flagsQuery.data?.flags ?? []).length ? <ul className="divide-y divide-line">
              {(flagsQuery.data?.flags ?? []).map((flag) => {
                const busy = setOverride.isPending || clearOverride.isPending
                return <li key={flag.name} className="flex flex-wrap items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="break-all text-sm font-medium">{flag.name || 'Unnamed feature flag'}</p>
                    <p className="mt-1 text-xs text-ink-muted">{flag.overridden ? 'Organization override' : 'Using platform default'} · {flag.enabled ? 'Enabled' : 'Disabled'}</p>
                  </div>
                  <Badge className={flag.overridden ? 'bg-brand-soft text-brand' : 'bg-surface-muted text-ink-muted'}>{flag.overridden ? 'Override' : 'Default'}</Badge>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={flag.enabled}
                      disabled={busy}
                      aria-label={`${flag.overridden ? 'Set' : 'Override'} ${flag.name} to ${flag.enabled ? 'disabled' : 'enabled'} for this organization`}
                      onCheckedChange={(enabled) => setOverride.mutate({ name: flag.name, enabled })}
                    />
                    {flag.overridden && <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => clearOverride.mutate(flag.name)}>Remove override</Button>}
                  </div>
                </li>
              })}
            </ul> : <p className="py-5 text-center text-sm text-ink-muted">No feature flags are registered.</p>}
          </>}
    </CardContent>
  </Card>
}
