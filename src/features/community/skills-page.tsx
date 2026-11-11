import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PencilSimpleIcon } from '@phosphor-icons/react'
import { useAuth } from '@/contexts/auth'
import { AppIconAction } from '@/components/ui/app-icon-action'
import { AppPagination } from '@/components/ui/app-pagination'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CommunityNoAccess } from './no-access'
import { SkillDialog } from './skill-dialog'
import { useCommunityErrors } from './use-community-errors'
import { listSkills, type Skill } from '@/services/admin-community'

const size=10
export function SkillsPage(){const {session}=useAuth();const [offset,setOffset]=useState(0);const [pageSize,setPageSize]=useState(size);const [editing,setEditing]=useState<Skill|null>(null);const [open,setOpen]=useState(false)
 const query=useQuery({queryKey:['community-skills',offset,pageSize],queryFn:()=>listSkills(session!.token,{limit:pageSize,offset}),enabled:Boolean(session?.token)})
 const forbidden=(query.error as {reason?:string}|null)?.reason==='forbidden'
 return <section className="space-y-5"><header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-xl font-semibold">Skills</h1><p className="mt-1 text-sm text-ink-muted">Maintain the skill options available to community members.</p></div><Button onClick={()=>{setEditing(null);setOpen(true)}}>Add skill</Button></header>{query.isLoading?<p role="status">Loading skills…</p>:forbidden?<CommunityNoAccess/>:query.isError?<div role="alert" className="space-y-2"><p>{useCommunityErrors(query.error)}</p><Button variant="outline" onClick={()=>void query.refetch()}>Retry</Button></div>:query.data?.items.length===0&&offset===0?<p className="rounded-lg border border-line bg-surface p-6">No skills configured.</p>:<Card className="gap-0 py-0"><CardContent className="p-0"><Table><TableHeader><tr><TableHead>Name</TableHead><TableHead>Slug</TableHead><TableHead>Actions</TableHead></tr></TableHeader><TableBody>{(query.data?.items??[]).map(skill=><TableRow key={skill.id}><TableCell>{skill.name||'Unnamed skill'}</TableCell><TableCell>{skill.slug||'—'}</TableCell><TableCell><AppIconAction label="Edit" icon={<PencilSimpleIcon/>} onClick={()=>{setEditing(skill);setOpen(true)}}/></TableCell></TableRow>)}</TableBody></Table><AppPagination pageIndex={Math.floor(offset/pageSize)} pageSize={pageSize} totalItems={query.data?.total??0} label="skills" onPageChange={p=>setOffset(p*pageSize)} onPageSizeChange={next=>{setPageSize(next);setOffset(0)}}/></CardContent></Card>}<SkillDialog open={open} onOpenChange={setOpen} skill={editing}/></section>}
