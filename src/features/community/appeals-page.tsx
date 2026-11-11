import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Gavel } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth'
import { AppIconAction } from '@/components/ui/app-icon-action'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { FilterTabs } from '@/components/ui/filter-tabs'
import { TableCell, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { listAppeals, decideAppeal, type Appeal } from '@/services/admin-community'
import { communityErrorMessage } from './use-community-errors'
import { CommunityNoAccess } from './no-access'
import { DecideAppealDialog } from './decide-appeal-dialog'
import { formatDate } from '@/lib/date-format'

const key = ['qk-admin-community-appeals'] as const
const tabs = [{ value: 'open', label: 'Open' }, { value: 'upheld', label: 'Upheld' }, { value: 'reversed', label: 'Reversed' }]
function adminIdFromToken(token: string) {
  try {
    const claims = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>
    for (const name of ['adminId', 'admin_id', 'sub']) if (typeof claims[name] === 'string') return claims[name]
  } catch { /* Non-JWT session tokens do not expose identity claims. */ }
  return ''
}
function statusClass(value: string) {
  if (value === 'open') return 'bg-warning-soft text-warning'
  if (value === 'upheld') return 'bg-success-soft text-success'
  if (value === 'reversed') return 'bg-info-soft text-info'
  return ''
}
const display = (value?: string | null) => value?.trim() || 'Not provided'

export function AppealsPage() {
  const { session } = useAuth()
  const client = useQueryClient()
  const [status, setStatus] = useState('open')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [selected, setSelected] = useState<Appeal | null>(null)
  const currentAdminId = adminIdFromToken(session?.token ?? '')
  const query = useQuery({ queryKey: [...key, status, page, pageSize], queryFn: () => listAppeals(session!.token, { status, limit: pageSize, offset: page * pageSize }), enabled: Boolean(session?.token) })
  const decide = useMutation({ mutationFn: ({ appeal, decision, note }: { appeal: Appeal; decision: 'uphold' | 'reverse'; note: string }) => decideAppeal(session!.token, appeal.id, { decision, note }), onSuccess: async () => { setSelected(null); toast.success('Appeal decision submitted.'); await client.invalidateQueries({ queryKey: key }) }, onError: (error) => toast.error(error && typeof error === 'object' && 'reason' in error && (error as { reason?: string }).reason === 'forbidden' ? 'Another moderator must decide this appeal' : communityErrorMessage(error)) })
  if (query.error && typeof query.error === 'object' && 'reason' in query.error && (query.error as { reason?: string }).reason === 'forbidden') return <CommunityNoAccess />
  const appeals = (query.data?.items ?? []).filter((appeal): appeal is Appeal => Boolean(appeal && typeof appeal.id === 'string'))
  return <section className="space-y-6">
    <div><h1 className="text-xl font-semibold tracking-tight">Appeals</h1><p className="mt-1 max-w-2xl text-sm text-ink-muted">Review community members’ appeals and decide whether the original moderation action should stand.</p></div>
    <FilterTabs label="Filter appeals by status" value={status} onValueChange={(value) => { setStatus(value); setPage(0) }} options={tabs} />
    <Card className="gap-0 py-0"><CardContent className="p-0"><DataTable data={appeals} headers={['User', 'Original action', 'Reason given', 'Appeal note', 'Submitted', { label: 'Actions', className: 'text-right' }]} label="Community appeals" loading={query.isLoading} loadingMessage="Loading appeals…" error={query.isError ? communityErrorMessage(query.error) : null} emptyMessage={status === 'open' ? 'No open appeals.' : `No ${status} appeals.`} pagination={{ pageIndex: page, pageSize, totalItems: query.data?.total ?? 0, onPageChange: setPage, onPageSizeChange: (size) => { setPageSize(size); setPage(0) } }} renderRow={(appeal: Appeal) => {
      const originalModerator = appeal.action?.moderatorUserId
      const restricted = Boolean(currentAdminId && originalModerator && currentAdminId === originalModerator)
      const action = display(appeal.action?.type).replaceAll('_', ' ')
      const submitted = appeal.submittedAt?.slice(0, 10)
      return <TableRow key={appeal.id}>
        <TableCell><span className="block font-medium">{display(appeal.userId)}</span><span className="mt-0.5 block text-xs text-ink-muted">{appeal.id}</span></TableCell>
        <TableCell><Badge variant="outline" className="capitalize">{action}</Badge></TableCell>
        <TableCell className="max-w-56 truncate" title={appeal.reason || ''}>{display(appeal.reason)}</TableCell>
        <TableCell className="max-w-56 truncate" title={appeal.note || ''}>{display(appeal.note)}</TableCell>
        <TableCell>{submitted ? <time dateTime={appeal.submittedAt}>{formatDate(submitted)}</time> : 'Not provided'}</TableCell>
        <TableCell className="text-right"><div className="flex justify-end">{restricted ? <Tooltip><TooltipTrigger render={<span tabIndex={0} className="inline-flex"><button type="button" disabled aria-label="Decide" className="inline-flex h-8 items-center gap-2 rounded-full bg-surface-muted px-3 text-xs text-ink-muted opacity-60"><Gavel size={16} />Decide</button></span>} /><TooltipContent>Another moderator must decide this appeal</TooltipContent></Tooltip> : appeal.status === 'open' ? <AppIconAction label="Decide" icon={<Gavel size={16} />} onClick={() => setSelected(appeal)} /> : <span className="text-xs text-ink-muted">Decided</span>}</div></TableCell>
      </TableRow>
    }} containerClassName="" /></CardContent></Card>
    {query.isError && !(query.error && typeof query.error === 'object' && 'reason' in query.error && (query.error as { reason?: string }).reason === 'forbidden') && <button className="text-sm text-brand underline" onClick={() => void query.refetch()}>Retry loading appeals</button>}
    <DecideAppealDialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null) }} pending={decide.isPending} onSubmit={(decision, note) => { if (selected) decide.mutate({ appeal: selected, decision, note }) }} />
  </section>
}
