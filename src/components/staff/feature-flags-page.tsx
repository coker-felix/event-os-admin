import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { TableCell, TableRow } from '@/components/ui/table'
import { listFeatureFlags, setFeatureFlagDefault, type FeatureFlag } from '@/services/admin-feature-flags'

const featureFlagQueryKey = ['qk-admin-feature-flags'] as const

function FeatureFlagRow({ flag }: { flag: FeatureFlag }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (enabled: boolean) => setFeatureFlagDefault(session!.token, flag.name, enabled),
    onSuccess: (updated) => {
      queryClient.setQueryData<{ flags: FeatureFlag[] }>(featureFlagQueryKey, (current) => current && ({
        flags: current.flags.map((item) => item.name === updated.name ? updated : item),
      }))
    },
  })

  return <TableRow>
    <TableCell>
      <span className="block font-medium text-ink">{flag.name}</span>
      <span className="mt-1 block whitespace-normal text-xs leading-5 text-ink-muted">{flag.description || 'No description provided.'}</span>
      {mutation.isError && <span role="alert" className="mt-1 block text-xs text-danger">{mutation.error.message}</span>}
    </TableCell>
    <TableCell>{flag.defaultEnabled ? <Badge className="bg-success-soft text-success">Enabled</Badge> : <Badge variant="outline">Disabled</Badge>}</TableCell>
    <TableCell className="text-right">
      <div className="flex items-center justify-end gap-3">
        <span className="text-xs text-ink-muted">{mutation.isPending ? 'Saving…' : flag.defaultEnabled ? 'On' : 'Off'}</span>
        <Switch
          checked={flag.defaultEnabled}
          disabled={mutation.isPending}
          aria-label={`${flag.defaultEnabled ? 'Disable' : 'Enable'} global default for ${flag.name}`}
          onCheckedChange={(enabled) => mutation.mutate(enabled)}
        />
      </div>
    </TableCell>
  </TableRow>
}

export function FeatureFlagsPage() {
  const { session } = useAuth()
  const [search, setSearch] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const flagsQuery = useQuery({
    queryKey: featureFlagQueryKey,
    queryFn: () => listFeatureFlags(session!.token),
    enabled: Boolean(session?.token),
  })
  const filteredFlags = useMemo(() => (flagsQuery.data?.flags ?? []).filter((flag) =>
    `${flag.name} ${flag.description}`.toLowerCase().includes(search.trim().toLowerCase())), [flagsQuery.data?.flags, search])
  const pageCount = Math.max(1, Math.ceil(filteredFlags.length / pageSize))
  const visibleFlags = filteredFlags.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)

  return <section className="space-y-6">
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Feature flags</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-muted">Control platform-wide defaults for features across Event OS.</p>
    </div>

    <div role="note" className="rounded-card border border-brand/15 bg-brand-soft/50 px-4 py-3 text-sm leading-6 text-ink-muted">
      Changes here update the global default. An organization, vendor, venue, or account with its own flag override continues to use that override.
    </div>

<div className="flex justify-end p-4"><input
          aria-label="Search feature flags"
          placeholder="Search name or description"
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPageIndex(0) }}
          className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/30 sm:w-64"
        /></div>
        <Card className="gap-0 py-0">
      <CardContent className="p-0">
        <DataTable data={visibleFlags} headers={['Feature flag', 'Default state', { label: 'Global default', className: 'text-right' }]} label="Feature flag platform defaults" loading={flagsQuery.isLoading} loadingMessage="Loading feature flags…" error={flagsQuery.isError ? flagsQuery.error.message : null} emptyMessage={search ? 'No feature flags match your search.' : 'No feature flags are registered.'} pagination={{ pageIndex, pageSize, totalItems: filteredFlags.length, onPageChange: (index) => setPageIndex(Math.min(index, pageCount - 1)), onPageSizeChange: (size) => { setPageSize(size); setPageIndex(0) } }} renderRow={(flag) => <FeatureFlagRow key={flag.name} flag={flag} />} containerClassName="" />
      </CardContent>
    </Card>
  </section>
}
