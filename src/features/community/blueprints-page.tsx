import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeSlash, GitBranch } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth'
import { AppIconAction } from '@/components/ui/app-icon-action'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { FilterTabs } from '@/components/ui/filter-tabs'
import { Input } from '@/components/ui/input'
import { TableCell, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/date-format'
import { listBlueprints, moderate, type AdminBlueprint, type ModerationActionInput } from '@/services/admin-community'
import { communityErrorMessage } from './use-community-errors'
import { CommunityNoAccess } from './no-access'
import { ModerationActionDialog } from './moderation-action-dialog'

const key = ['qk-admin-community-blueprints'] as const
const tabs = [{ value: '', label: 'All' }, { value: 'published', label: 'Published' }, { value: 'hidden', label: 'Hidden' }, { value: 'withdrawn', label: 'Withdrawn' }]
const display = (value?: string | null) => value?.trim() || 'Not provided'
function statusStyle(value: string) {
  if (value === 'published') return 'bg-success-soft text-success'
  if (value === 'hidden') return 'bg-warning-soft text-warning'
  if (value === 'withdrawn') return 'bg-surface-muted text-ink-muted'
  return ''
}

export function BlueprintsPage() {
  const { session } = useAuth()
  const client = useQueryClient()
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [pendingAction, setPendingAction] = useState<{ blueprint: AdminBlueprint; action: 'hide' | 'restore' | 'withdraw' } | null>(null)
  const query = useQuery({ queryKey: [...key, status, search, page, pageSize], queryFn: () => listBlueprints(session!.token, { status: status || undefined, q: search || undefined, limit: pageSize, offset: page * pageSize }), enabled: Boolean(session?.token) })
  const mutation = useMutation({ mutationFn: (input: ModerationActionInput) => moderate(session!.token, input), onSuccess: async () => { setPendingAction(null); toast.success('Blueprint moderation action submitted.'); await client.invalidateQueries({ queryKey: key }) }, onError: (error) => toast.error(communityErrorMessage(error)) })
  if (query.error && typeof query.error === 'object' && 'reason' in query.error && (query.error as { reason?: string }).reason === 'forbidden') return <CommunityNoAccess />
  const rows = (query.data?.items ?? []).filter((item): item is AdminBlueprint => Boolean(item && typeof item.id === 'string'))
  return <section className="space-y-6">
    <div><h1 className="text-xl font-semibold tracking-tight">Blueprints</h1><p className="mt-1 max-w-2xl text-sm text-ink-muted">Find community blueprints by title and status, then hide, restore, or withdraw them when needed.</p></div>
    <div className="space-y-3"><FilterTabs label="Filter blueprints by status" value={status} onValueChange={(value) => { setStatus(value); setPage(0) }} options={tabs} /><label className="block max-w-sm space-y-1.5 text-sm font-medium">Search blueprints<Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(0) }} placeholder="Search by title" /></label></div>
    <Card className="gap-0 py-0"><CardContent className="p-0"><DataTable data={rows} headers={['Blueprint', 'Credited org', 'Version', { label: 'Forks', className: 'text-right' }, 'Status', 'Published', { label: 'Actions', className: 'text-right' }]} label="Community blueprints" loading={query.isLoading} loadingMessage="Loading blueprints…" error={query.isError ? communityErrorMessage(query.error) : null} emptyMessage={search || status ? 'No blueprints match these filters.' : 'No blueprints are available.'} pagination={{ pageIndex: page, pageSize, totalItems: query.data?.total ?? 0, onPageChange: setPage, onPageSizeChange: (size) => { setPageSize(size); setPage(0) } }} renderRow={(blueprint: AdminBlueprint) => {
      const actions: Array<{ action: 'hide' | 'restore' | 'withdraw'; label: string; icon: React.ReactNode }> = []
      if (blueprint.status === 'published') actions.push({ action: 'hide', label: 'Hide', icon: <EyeSlash size={16} /> })
      if (blueprint.status === 'hidden') actions.push({ action: 'restore', label: 'Restore', icon: <Eye size={16} /> })
      if (blueprint.status !== 'withdrawn') actions.push({ action: 'withdraw', label: 'Withdraw', icon: <GitBranch size={16} /> })
      return <TableRow key={blueprint.id}>
        <TableCell><span className="block font-medium">{display(blueprint.title || blueprint.snapshot?.name)}</span><span className="mt-0.5 block text-xs text-ink-muted">{display(blueprint.authorName)}</span></TableCell>
        <TableCell>{display(blueprint.creditedOrgName)}</TableCell><TableCell>{blueprint.version ?? blueprint.snapshot?.version ?? '—'}</TableCell>
        <TableCell className="text-right tabular-nums">{blueprint.forkCount ?? 0}</TableCell>
        <TableCell><Badge className={statusStyle(blueprint.status)}>{display(blueprint.status)}</Badge></TableCell>
        <TableCell>{blueprint.publishedAt ? <time dateTime={blueprint.publishedAt}>{formatDate(blueprint.publishedAt.slice(0, 10))}</time> : 'Not published'}</TableCell>
        <TableCell className="text-right"><div className="flex justify-end gap-1">{actions.map(({ action, label, icon }) => <AppIconAction key={action} label={label} icon={icon} onClick={() => setPendingAction({ blueprint, action })} />)}</div></TableCell>
      </TableRow>
    }} containerClassName="" /></CardContent></Card>
    {query.isError && !(query.error && typeof query.error === 'object' && 'reason' in query.error && (query.error as { reason?: string }).reason === 'forbidden') && <button className="text-sm text-brand underline" onClick={() => void query.refetch()}>Retry loading blueprints</button>}
    {pendingAction && <ModerationActionDialog open onOpenChange={(open) => { if (!open) setPendingAction(null) }} title={`${pendingAction.action[0].toUpperCase()}${pendingAction.action.slice(1)} blueprint`} targetType="blueprint" targetId={pendingAction.blueprint.id} action={pendingAction.action} pending={mutation.isPending} onSubmit={(input) => mutation.mutate(input)} />}
  </section>
}
