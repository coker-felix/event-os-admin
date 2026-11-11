import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EyeSlash, ArrowCounterClockwise, WarningCircle, XCircle, UserMinus } from '@phosphor-icons/react'
import { useAuth } from '@/contexts/auth'
import { AppIconAction } from '@/components/ui/app-icon-action'
import { AppPagination } from '@/components/ui/app-pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FilterTabs } from '@/components/ui/filter-tabs'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/date-format'
import { listReports, moderate, type CommunityReport, type ModerationActionInput } from '@/services/admin-community'
import { availableActions, type ModerationAction } from './action-rules'
import { ModerationActionDialog } from './moderation-action-dialog'
import { CommunityNoAccess } from './no-access'
import { communityErrorMessage } from './use-community-errors'
import { ReportSidePanel } from './report-side-panel'

const PAGE_SIZE = 10
const statuses = [{ value: 'open', label: 'Open' }, { value: 'actioned', label: 'Actioned' }, { value: 'dismissed', label: 'Dismissed' }]
const titles: Record<ModerationAction, string> = { hide: 'Hide target', restore: 'Restore target', withdraw: 'Withdraw blueprint', suspend_user: 'Suspend author', dismiss: 'Dismiss report' }
const actionIcons: Record<ModerationAction, React.ReactNode> = { hide: <EyeSlash aria-hidden="true" />, restore: <ArrowCounterClockwise aria-hidden="true" />, withdraw: <WarningCircle aria-hidden="true" />, suspend_user: <UserMinus aria-hidden="true" />, dismiss: <XCircle aria-hidden="true" /> }
const semantic = (status: string) => status === 'published' ? 'bg-success-soft text-success' : status === 'hidden' ? 'bg-warning-soft text-warning' : 'bg-surface-muted text-ink-muted'
const monogram = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?'

export function ReportsPage() {
  const { session } = useAuth()
  const client = useQueryClient()
  const [status, setStatus] = useState('open')
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [selected, setSelected] = useState<CommunityReport | null>(null)
  const [pendingAction, setPendingAction] = useState<{ report: CommunityReport; action: ModerationAction } | null>(null)
  const [actionError, setActionError] = useState('')
  const query = useQuery({ queryKey: ['community-reports', status, search, offset, pageSize], queryFn: () => listReports(session!.token, { status, ...(search.trim() ? { q: search.trim() } : {}), limit: pageSize, offset }), enabled: Boolean(session?.token) })
  const mutation = useMutation({ mutationFn: (input: ModerationActionInput) => moderate(session!.token, input), onSuccess: () => { setPendingAction(null); setActionError(''); void client.invalidateQueries({ queryKey: ['community-reports'] }); void client.invalidateQueries({ queryKey: ['community-target-reports'] }) }, onError: (error) => setActionError(communityErrorMessage(error)) })
  const noAccess = (query.error as { reason?: string } | null)?.reason === 'forbidden'
  const rows = query.data?.items ?? []
  const emptyMessage = search.trim() ? 'No reports match your search.' : status === 'open' ? 'No open reports' : `No ${status} reports.`
  return <section className="space-y-5">
    <header><h1 className="text-xl font-semibold">Reports</h1><p className="mt-1 text-sm text-ink-muted">Review community reports and take moderation action.</p></header>
    {noAccess ? <CommunityNoAccess /> : <>
      <div className="space-y-3"><FilterTabs label="Filter reports by status" value={status} onValueChange={(value) => { setStatus(value); setOffset(0) }} options={statuses} /><Input aria-label="Search reports by target title" placeholder="Search target title" value={search} onChange={(event) => { setSearch(event.target.value); setOffset(0) }} /></div>
      {actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
      {query.isLoading ? <p role="status">Loading reports…</p> : query.isError ? <div role="alert" className="space-y-2"><p>{communityErrorMessage(query.error)}</p><Button variant="outline" onClick={() => void query.refetch()}>Retry</Button></div> : rows.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-ink-muted">{emptyMessage}</CardContent></Card> : <Card className="gap-0 py-0"><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Target</TableHead><TableHead>Reason</TableHead><TableHead className="text-right">Open reports</TableHead><TableHead>Target status</TableHead><TableHead>Reported</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{rows.map((report) => {
        const target = report.targetPreview
        const displayTitle = target.title || 'Untitled target'
        const openCount = report.openReportCount ?? 0
        return <TableRow key={report.id} className="cursor-pointer" onClick={() => setSelected(report)}><TableCell><div className="flex items-center gap-3"><span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">{monogram(displayTitle)}</span><div className="min-w-0"><p className="max-w-64 truncate font-medium">{displayTitle}</p><p className="mt-0.5 text-xs text-ink-muted">{report.targetType || 'Target'} · {target.authorName || 'Unknown author'}</p></div></div></TableCell><TableCell className="max-w-56 truncate">{report.reason || 'No reason supplied'}</TableCell><TableCell className="text-right tabular-nums">{openCount}</TableCell><TableCell><Badge className={semantic(target.status || '')}>{target.status || 'Unknown'}</Badge></TableCell><TableCell>{formatDate(report.createdAt?.slice(0, 10))}</TableCell><TableCell className="text-right" onClick={(event) => event.stopPropagation()}><div className="flex justify-end gap-1">{availableActions(report).map((action) => <AppIconAction key={action} label={action === 'suspend_user' ? 'Suspend author' : action === 'withdraw' ? 'Withdraw' : titles[action].replace(' target', '')} icon={actionIcons[action]} disabled={mutation.isPending} onClick={() => { setActionError(''); setPendingAction({ report, action }) }} />)}</div></TableCell></TableRow>
      })}</TableBody></Table></div><AppPagination pageIndex={Math.floor(offset / pageSize)} pageSize={pageSize} totalItems={query.data?.total ?? 0} label="reports" onPageChange={(index) => setOffset(index * pageSize)} onPageSizeChange={(size) => { setPageSize(size); setOffset(0) }} /></CardContent></Card>}
    </>}
    <ModerationActionDialog open={Boolean(pendingAction)} onOpenChange={(open) => { if (!open) setPendingAction(null) }} title={pendingAction ? titles[pendingAction.action] : 'Moderation action'} targetType={pendingAction?.action === 'suspend_user' ? 'user' : pendingAction?.report.targetType ?? ''} targetId={pendingAction?.action === 'suspend_user' ? pendingAction.report.targetPreview.authorUserId || '' : pendingAction?.report.targetId ?? ''} action={pendingAction?.action ?? 'dismiss'} reportId={pendingAction?.report.id} onSubmit={(input) => mutation.mutate(input)} pending={mutation.isPending} />
    <ReportSidePanel report={selected} open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null) }} />
  </section>
}
