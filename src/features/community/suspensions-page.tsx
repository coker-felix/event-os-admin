import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldCheckIcon } from '@phosphor-icons/react'
import { useAuth } from '@/contexts/auth'
import { AppIconAction } from '@/components/ui/app-icon-action'
import { AppPagination } from '@/components/ui/app-pagination'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useCommunityErrors } from './use-community-errors'
import { CommunityNoAccess } from './no-access'
import { SuspendUserDialog } from './suspend-user-dialog'
import { getAdminProfile, listSuspensions, moderate, type Suspension } from '@/services/admin-community'
import { formatDate } from '@/lib/date-format'

const size = 10
export function SuspensionsPage() {
 const { session } = useAuth(); const client = useQueryClient(); const [offset, setOffset] = useState(0); const [pageSize, setPageSize] = useState(size); const [suspendOpen, setSuspendOpen] = useState(false); const [selected, setSelected] = useState<Suspension | null>(null); const [unsuspend, setUnsuspend] = useState<Suspension | null>(null); const [reason, setReason] = useState(''); const [actionError, setActionError] = useState('')
 const query = useQuery({ queryKey: ['community-suspensions', offset, pageSize], queryFn: () => listSuspensions(session!.token, { limit: pageSize, offset }), enabled: Boolean(session?.token) })
 const profile = useQuery({ queryKey: ['community-profile', selected?.userId], queryFn: () => getAdminProfile(session!.token, selected!.userId), enabled: Boolean(session?.token && selected?.userId) })
 const action = useMutation({ mutationFn: () => moderate(session!.token, { targetType: 'user', targetId: unsuspend!.userId, action: 'unsuspend_user', reason: reason.trim() }), onSuccess: () => { void client.invalidateQueries({ queryKey: ['community-suspensions'] }); setUnsuspend(null); setReason(''); setActionError('') }, onError: e => setActionError(useCommunityErrors(e)) })
 const forbidden = (query.error as { reason?: string } | null)?.reason === 'forbidden'
 return <section className="space-y-5"><header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-xl font-semibold">Suspensions</h1><p className="mt-1 text-sm text-ink-muted">Review active community suspensions and manage access.</p></div><Button onClick={() => setSuspendOpen(true)}>Suspend a user</Button></header>{query.isLoading ? <p role="status">Loading suspensions…</p> : forbidden ? <CommunityNoAccess /> : query.isError ? <div role="alert" className="space-y-2"><p>{useCommunityErrors(query.error)}</p><Button variant="outline" onClick={() => void query.refetch()}>Retry</Button></div> : query.data?.items.length === 0 && offset === 0 ? <p className="rounded-lg border border-line bg-surface p-6">No active suspensions.</p> : <Card className="gap-0 py-0"><CardContent className="p-0"><Table><TableHeader><tr><TableHead>User</TableHead><TableHead>Reason</TableHead><TableHead>Until</TableHead><TableHead>Suspended by</TableHead><TableHead>Since</TableHead><TableHead>Actions</TableHead></tr></TableHeader><TableBody>{(query.data?.items ?? []).map(row => <TableRow key={row.userId} className="cursor-pointer" onClick={() => setSelected(row)}><TableCell><span className="font-medium">{row.userId || 'Unknown user'}</span><span className="block text-xs text-ink-muted">Community user</span></TableCell><TableCell>{row.reason || '—'}</TableCell><TableCell>{row.until ? formatDate(row.until) : 'No end date'}</TableCell><TableCell>{row.suspendedBy || '—'}</TableCell><TableCell>{formatDate(row.since?.slice(0, 10))}</TableCell><TableCell><AppIconAction label="Unsuspend" icon={<ShieldCheckIcon />} showLabel onClick={() => { setUnsuspend(row); setReason(''); setActionError('') }} /></TableCell></TableRow>)}</TableBody></Table><AppPagination pageIndex={Math.floor(offset / pageSize)} pageSize={pageSize} totalItems={query.data?.total ?? 0} label="suspensions" onPageChange={p => setOffset(p * pageSize)} onPageSizeChange={next => { setPageSize(next); setOffset(0) }} /></CardContent></Card>}
 {selected && <aside className="rounded-lg border border-line bg-surface p-5" aria-label="Suspended user profile"><div className="flex justify-between"><h2 className="font-semibold">User profile</h2><Button variant="outline" size="sm" onClick={() => setSelected(null)}>Close</Button></div>{profile.isLoading ? <p role="status" className="mt-3">Loading profile…</p> : profile.isError ? <p role="alert" className="mt-3">{useCommunityErrors(profile.error)}</p> : <pre className="mt-3 whitespace-pre-wrap text-sm">{JSON.stringify(profile.data ?? {}, null, 2)}</pre>}</aside>}
 <SuspendUserDialog open={suspendOpen} onOpenChange={setSuspendOpen} />
 <Dialog open={Boolean(unsuspend)} onOpenChange={open => { if (!open) setUnsuspend(null) }}><DialogContent><DialogHeader><DialogTitle>Unsuspend user</DialogTitle><DialogDescription>Enter a reason for removing this suspension.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={e => { e.preventDefault(); action.mutate() }}><label className="block space-y-1 text-sm">Reason<Input aria-label="Reason" value={reason} onChange={e => setReason(e.target.value)} required /></label>{actionError && <p role="alert">{actionError}</p>}<DialogFooter><Button type="submit" disabled={!reason.trim() || action.isPending}>Unsuspend</Button></DialogFooter></form></DialogContent></Dialog>
 </section>
}
