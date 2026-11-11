import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react'
import { useAuth } from '@/contexts/auth'
import { AppIconAction } from '@/components/ui/app-icon-action'
import { AppPagination } from '@/components/ui/app-pagination'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FilterTabs } from '@/components/ui/filter-tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CommunityNoAccess } from './no-access'
import { formatDate } from '@/lib/date-format'
import { useCommunityErrors } from './use-community-errors'
import { GrantBadgeDialog } from './grant-badge-dialog'
import { listBadges, setBadge, type BadgeHolder } from '@/services/admin-community'

const size=10
export function BadgesPage(){const {session}=useAuth();const client=useQueryClient();const [badge,setBadgeFilter]=useState('founding_member');const [offset,setOffset]=useState(0);const [pageSize,setPageSize]=useState(size);const [grantOpen,setGrantOpen]=useState(false);const [revoking,setRevoking]=useState<BadgeHolder|null>(null);const [error,setError]=useState('')
 const query=useQuery({queryKey:['community-badges',badge,offset,pageSize],queryFn:()=>listBadges(session!.token,badge,{limit:pageSize,offset}),enabled:Boolean(session?.token)})
 const revoke=useMutation({mutationFn:()=>setBadge(session!.token,{userId:revoking!.userId,badge,grant:false}),onSuccess:()=>{void client.invalidateQueries({queryKey:['community-badges']});setRevoking(null)},onError:e=>setError(useCommunityErrors(e))})
 const forbidden=(query.error as {reason?:string}|null)?.reason==='forbidden'
 return <section className="space-y-5"><header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-xl font-semibold">Badges</h1><p className="mt-1 text-sm text-ink-muted">Recognize founding members and staff in the community.</p></div><Button onClick={()=>setGrantOpen(true)}>Grant badge</Button></header><div className="flex justify-between gap-4"><FilterTabs label="Filter badges" value={badge} onValueChange={v=>{setBadgeFilter(v);setOffset(0)}} options={[{value:'founding_member',label:'Founding member'},{value:'staff',label:'Staff'}]} /></div>{query.isLoading?<p role="status">Loading badges…</p>:forbidden?<CommunityNoAccess/>:query.isError?<div role="alert" className="space-y-2"><p>{useCommunityErrors(query.error)}</p><Button variant="outline" onClick={()=>void query.refetch()}>Retry</Button></div>:query.data?.items.length===0&&offset===0?<p className="rounded-lg border border-line bg-surface p-6">No users have this badge yet.</p>:<Card className="gap-0 py-0"><CardContent className="p-0"><Table><TableHeader><tr><TableHead>User</TableHead><TableHead>Granted</TableHead><TableHead>Actions</TableHead></tr></TableHeader><TableBody>{(query.data?.items??[]).map(row=><TableRow key={row.userId}><TableCell><span className="font-medium">{row.displayName||'Unnamed user'}</span><span className="block text-xs text-ink-muted">{row.userId||'Unknown user'}</span></TableCell><TableCell>{row.grantedAt ? formatDate(row.grantedAt.slice(0,10)) : 'Not provided'}</TableCell><TableCell><AppIconAction label="Revoke" icon={<ArrowCounterClockwiseIcon/>} showLabel onClick={()=>{setRevoking(row);setError('')}}/></TableCell></TableRow>)}</TableBody></Table><AppPagination pageIndex={Math.floor(offset/pageSize)} pageSize={pageSize} totalItems={query.data?.total??0} label="badges" onPageChange={p=>setOffset(p*pageSize)} onPageSizeChange={next=>{setPageSize(next);setOffset(0)}}/></CardContent></Card>}
 <GrantBadgeDialog open={grantOpen} onOpenChange={setGrantOpen} badge={badge}/><Dialog open={Boolean(revoking)} onOpenChange={open=>{if(!open)setRevoking(null)}}><DialogContent><DialogHeader><DialogTitle>Revoke badge</DialogTitle><DialogDescription>Remove this badge from {revoking?.displayName||revoking?.userId||'this user'}?</DialogDescription></DialogHeader>{error&&<p role="alert">{error}</p>}<DialogFooter><Button variant="destructive" onClick={()=>revoke.mutate()} disabled={revoke.isPending}>Revoke badge</Button></DialogFooter></DialogContent></Dialog></section>}
