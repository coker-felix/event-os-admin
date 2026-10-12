import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import { AppIconAction } from '@/components/ui/app-icon-action'
import { AppPagination } from '@/components/ui/app-pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { createAdminConsumer, getAdminConsumer, listAdminConsumers, setAdminConsumerStatus, type AdminConsumer } from '@/services/admin-users'

const usersQueryKey = ['qk-admin-consumers'] as const

function UserStatus({ status }: { status: AdminConsumer['status'] }) {
  if (status === 'active') return <Badge className="bg-success-soft text-success">Active</Badge>
  if (status === 'suspended') return <Badge className="bg-danger-soft text-danger">Suspended</Badge>
  if (status === 'guest') return <Badge className="bg-brand-soft text-brand">Guest</Badge>
  return <Badge variant="outline">Unknown</Badge>
}

function Monogram({ name }: { name: string }) {
  const initials = (name ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?'
  return <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">{initials}</span>
}

function ConsumerDetails({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const { session } = useAuth()
  const query = useQuery({
    queryKey: [...usersQueryKey, 'detail', userId],
    queryFn: () => getAdminConsumer(session!.token, userId!),
    enabled: Boolean(session?.token && userId),
  })
  const user = query.data
  return <Dialog open={Boolean(userId)} onOpenChange={(open) => { if (!open) onClose() }}>
    <DialogContent>
      <DialogHeader><DialogTitle>Account details</DialogTitle><DialogDescription>Profile and account provenance for this consumer.</DialogDescription></DialogHeader>
      {query.isLoading ? <p className="py-6 text-sm text-ink-muted">Loading account…</p>
        : query.isError ? <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{query.error.message}</p>
          : user ? <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 text-sm">
            <dt className="text-ink-muted">Name</dt><dd className="font-medium">{user.name || 'Unnamed user'}</dd>
            <dt className="text-ink-muted">Email</dt><dd className="break-all">{user.email || 'Not provided'}</dd>
            <dt className="text-ink-muted">Phone</dt><dd>{user.phone || 'Not provided'}</dd>
            <dt className="text-ink-muted">Status</dt><dd><UserStatus status={user.status} /></dd>
            <dt className="text-ink-muted">Email verified</dt><dd>{user.emailVerified ? 'Yes' : 'No'}</dd>
            <dt className="text-ink-muted">Phone verified</dt><dd>{user.phoneVerified ? 'Yes' : 'No'}</dd>
            <dt className="text-ink-muted">Created via</dt><dd>{user.createdVia || 'Unknown'}</dd>
            {user.createdByOrgId && <><dt className="text-ink-muted">Created by organization</dt><dd className="break-all">{user.createdByOrgId}</dd></>}
          </dl> : <p className="py-6 text-sm text-ink-muted">No account details were returned.</p>}
    </DialogContent>
  </Dialog>
}

function CreateUserSheet({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (id: string) => void }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const mutation = useMutation({
    mutationFn: () => createAdminConsumer(session!.token, {
      name: name.trim(),
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      ...(password ? { password } : {}),
    }),
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries({ queryKey: usersQueryKey })
      setName(''); setEmail(''); setPhone(''); setPassword('')
      onOpenChange(false)
      onCreated(id)
    },
  })

  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
      <SheetHeader><SheetTitle>Add consumer account</SheetTitle><SheetDescription>Create a consumer profile. Email, phone, and password are optional.</SheetDescription></SheetHeader>
      <form id="create-consumer-form" className="flex-1 space-y-4 overflow-y-auto px-6 pb-6" onSubmit={(event) => { event.preventDefault(); mutation.mutate() }}>
        <label className="block space-y-1.5 text-sm font-medium">Full name<Input autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="block space-y-1.5 text-sm font-medium">Email <span className="font-normal text-ink-muted">(optional)</span><Input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="block space-y-1.5 text-sm font-medium">Phone <span className="font-normal text-ink-muted">(optional)</span><Input autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
        <label className="block space-y-1.5 text-sm font-medium">Password <span className="font-normal text-ink-muted">(optional)</span><Input autoComplete="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {mutation.isError && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{mutation.error.message}</p>}
      </form>
      <SheetFooter className="border-t border-line"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" form="create-consumer-form" disabled={mutation.isPending || !name.trim()}>{mutation.isPending ? 'Creating…' : 'Create account'}</Button></SheetFooter>
    </SheetContent>
  </Sheet>
}

export function AccountsUsersPage() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'' | 'guest' | 'active' | 'suspended'>('')
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailsUserId, setDetailsUserId] = useState<string | null>(null)
  const usersQuery = useQuery({
    queryKey: [...usersQueryKey, status],
    queryFn: () => listAdminConsumers(session!.token, status || undefined),
    enabled: Boolean(session?.token),
  })
  const users = usersQuery.data?.users ?? []
  const filteredUsers = useMemo(() => users.filter((user) => `${user.name ?? ''} ${user.email ?? ''} ${user.phone ?? ''}`.toLowerCase().includes(search.trim().toLowerCase())), [users, search])
  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  const visibleUsers = filteredUsers.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
  const statusMutation = useMutation({
    mutationFn: ({ user, nextStatus }: { user: AdminConsumer; nextStatus: 'active' | 'suspended' }) => setAdminConsumerStatus(session!.token, user.id, nextStatus),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: usersQueryKey }) },
  })

  return <section className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Accounts</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Consumer users</h1><p className="mt-2 max-w-2xl text-sm text-ink-muted">Review consumer accounts and manage access across Event OS.</p></div>
      <Button onClick={() => setCreateOpen(true)}>Add user</Button>
    </div>

    {statusMutation.isError && <p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">{statusMutation.error.message}</p>}

    <Card>
      <CardHeader className="border-b border-line sm:grid-cols-[1fr_auto_auto] sm:items-center">
        <div><CardTitle>Accounts</CardTitle><p data-slot="card-description" className="text-sm text-ink-muted">{usersQuery.data?.users.length ?? '—'} accounts</p></div>
        <label className="sr-only" htmlFor="user-search">Search consumer users</label><Input id="user-search" placeholder="Search name, email, phone" value={search} onChange={(event) => { setSearch(event.target.value); setPageIndex(0) }} className="sm:w-64" />
        <label className="sr-only" htmlFor="user-status">Filter by status</label><select id="user-status" value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPageIndex(0) }} className="h-9 rounded-lg border border-line bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/30"><option value="">All statuses</option><option value="guest">Guest</option><option value="active">Active</option><option value="suspended">Suspended</option></select>
      </CardHeader>
      <CardContent className="p-0">
        {usersQuery.isLoading ? <p className="px-6 py-10 text-center text-sm text-ink-muted">Loading consumer accounts…</p>
          : usersQuery.isError ? <div role="alert" className="m-5 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">{usersQuery.error.message}</div>
            : <div className="overflow-x-auto"><Table aria-label="Consumer accounts">
              <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Contact</TableHead><TableHead>Status</TableHead><TableHead>Created via</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {visibleUsers.length ? visibleUsers.map((user) => <TableRow key={user.id}>
                  <TableCell><div className="flex items-center gap-3"><Monogram name={user.name || 'Unnamed user'} /><div className="min-w-0"><p className="truncate font-medium text-ink">{user.name || 'Unnamed user'}</p><p className="mt-0.5 truncate text-xs text-ink-muted">{user.email || user.phone || 'No contact details'}</p></div></div></TableCell>
                  <TableCell><span className="block">{user.email || '—'}</span><span className="mt-0.5 block text-xs text-ink-muted">{user.phone || 'No phone number'}</span></TableCell>
                  <TableCell><UserStatus status={user.status} /></TableCell>
                  <TableCell>{user.createdVia || '—'}</TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-1"><AppIconAction label={`View ${user.name}`} icon={<span aria-hidden="true">↗</span>} onClick={() => setDetailsUserId(user.id)} /><AppIconAction label={`${user.status === 'active' ? 'Suspend' : 'Activate'} ${user.name}`} icon={<span aria-hidden="true">{user.status === 'active' ? 'Ⅱ' : '▶'}</span>} disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ user, nextStatus: user.status === 'active' ? 'suspended' : 'active' })} /></div></TableCell>
                </TableRow>) : <TableRow><TableCell colSpan={5} className="h-36 text-center">
                  {search ? <p className="text-sm text-ink-muted">No accounts match “{search}”. Try another search.</p>
                    : status ? <p className="text-sm text-ink-muted">No {status} consumer accounts found.</p>
                      : <div className="mx-auto max-w-sm"><p className="text-sm font-medium text-ink">No consumer accounts yet</p><p className="mt-1 text-sm text-ink-muted">Add a user to start managing consumer access.</p><Button className="mt-3" variant="outline" size="sm" onClick={() => setCreateOpen(true)}>Add first user</Button></div>}
                </TableCell></TableRow>}
              </TableBody>
            </Table></div>}
        <AppPagination pageIndex={pageIndex} pageSize={pageSize} totalItems={filteredUsers.length} onPageChange={(index) => setPageIndex(Math.min(index, pageCount - 1))} onPageSizeChange={(size) => { setPageSize(size); setPageIndex(0) }} label="consumer accounts" />
      </CardContent>
    </Card>
    <CreateUserSheet open={createOpen} onOpenChange={setCreateOpen} onCreated={(id) => setDetailsUserId(id)} />
    <ConsumerDetails userId={detailsUserId} onClose={() => setDetailsUserId(null)} />
  </section>
}
