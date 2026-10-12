import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import { AppPagination } from '@/components/ui/app-pagination'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Staff & access</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Feature flags</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">Control platform-wide defaults for features across Event OS.</p>
    </div>

    <div role="note" className="rounded-card border border-brand/15 bg-brand-soft/50 px-4 py-3 text-sm leading-6 text-ink-muted">
      Changes here update the global default. An organization, vendor, venue, or account with its own flag override continues to use that override.
    </div>

    <Card>
      <CardHeader className="border-b border-line sm:grid-cols-[1fr_auto] sm:items-center">
        <div><CardTitle>Platform defaults</CardTitle><p data-slot="card-description" className="text-sm text-ink-muted">{flagsQuery.data?.flags.length ?? '—'} registered flags</p></div>
        <input
          aria-label="Search feature flags"
          placeholder="Search name or description"
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPageIndex(0) }}
          className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/30 sm:w-64"
        />
      </CardHeader>
      <CardContent className="p-0">
        {flagsQuery.isLoading ? <p className="px-6 py-10 text-center text-sm text-ink-muted">Loading feature flags…</p>
          : flagsQuery.isError ? <div role="alert" className="m-5 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">{flagsQuery.error.message}</div>
            : <Table aria-label="Feature flag platform defaults">
              <TableHeader><TableRow><TableHead>Feature flag</TableHead><TableHead>Default state</TableHead><TableHead className="text-right">Global default</TableHead></TableRow></TableHeader>
              <TableBody>
                {visibleFlags.length ? visibleFlags.map((flag) => <FeatureFlagRow key={flag.name} flag={flag} />)
                  : <TableRow><TableCell colSpan={3} className="h-28 text-center text-sm text-ink-muted">{search ? 'No feature flags match your search.' : 'No feature flags are registered.'}</TableCell></TableRow>}
              </TableBody>
            </Table>}
        <AppPagination pageIndex={pageIndex} pageSize={pageSize} totalItems={filteredFlags.length} onPageChange={(index) => setPageIndex(Math.min(index, pageCount - 1))} onPageSizeChange={(size) => { setPageSize(size); setPageIndex(0) }} label="feature flags" />
      </CardContent>
    </Card>
  </section>
}
