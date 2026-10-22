import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import { AppIconAction } from '@/components/ui/app-icon-action'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FilterTabs } from '@/components/ui/filter-tabs'
import { TableCell, TableRow } from '@/components/ui/table'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { createAdminConsumer, getAdminConsumer, listAdminConsumerChannels, listAdminConsumers, setAdminConsumerStatus, type AdminConsumer } from '@/services/admin-users'
import { listAdminOrganizations } from '@/services/admin-account-directory'

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
  const channelsQuery = useQuery({
    queryKey: [...usersQueryKey, 'channels', userId],
    queryFn: () => listAdminConsumerChannels(session!.token, userId!),
    enabled: Boolean(session?.token && userId),
  })
  const organizationsQuery = useQuery({
    queryKey: ['qk-admin-organizations'],
    queryFn: () => listAdminOrganizations(session!.token),
    enabled: Boolean(session?.token && userId),
  })
  const user = query.data
  const organizations = (organizationsQuery.data?.organizations ?? []).filter((organization) => organization.ownerId === userId)
  const channels = channelsQuery.data?.channels ?? []
  return <Sheet open={Boolean(userId)} onOpenChange={(open) => { if (!open) onClose() }}>
    <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
      <SheetHeader><SheetTitle>Account details</SheetTitle><SheetDescription>Profile, sign-in channels, and organization ownership for this consumer.</SheetDescription></SheetHeader>
      <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-6">
        {query.isLoading ? <p className="py-2 text-sm text-ink-muted">Loading account…</p>
          : query.isError ? <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{query.error.message}</p>
            : user ? <Card><CardHeader><CardTitle>Profile</CardTitle></CardHeader><CardContent><dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 text-sm">
              <dt className="text-ink-muted">Name</dt><dd className="font-medium">{user.name || 'Unnamed user'}</dd>
              <dt className="text-ink-muted">Email</dt><dd className="break-all">{user.email || 'Not provided'}</dd>
              <dt className="text-ink-muted">Phone</dt><dd>{user.phone || 'Not provided'}</dd>
              <dt className="text-ink-muted">Status</dt><dd><UserStatus status={user.status} /></dd>
              <dt className="text-ink-muted">Email verified</dt><dd>{user.emailVerified ? 'Yes' : 'No'}</dd>
              <dt className="text-ink-muted">Phone verified</dt><dd>{user.phoneVerified ? 'Yes' : 'No'}</dd>
              <dt className="text-ink-muted">Created via</dt><dd>{user.createdVia || 'Unknown'}</dd>
              {user.createdByOrgId && <><dt className="text-ink-muted">Created by organization</dt><dd className="break-all">{user.createdByOrgId}</dd></>}
            </dl></CardContent></Card> : <p className="py-2 text-sm text-ink-muted">No account details were returned.</p>}
        <Card><CardHeader><CardTitle>Channels</CardTitle></CardHeader><CardContent>
          {channelsQuery.isLoading ? <p className="text-sm text-ink-muted">Loading user channels…</p> : channelsQuery.isError ? <p role="alert" className="text-sm text-danger">{channelsQuery.error.message}</p> : channels.length ? <ul className="flex flex-wrap gap-2">{channels.map((channel) => <li key={channel.channel}><Badge variant="outline">{channel.channel}</Badge></li>)}</ul> : <p className="text-sm text-ink-muted">No channels recorded for this account.</p>}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Organizations owned</CardTitle></CardHeader><CardContent>
          {organizationsQuery.isLoading ? <p className="text-sm text-ink-muted">Loading organizations…</p> : organizationsQuery.isError ? <p role="alert" className="text-sm text-danger">{organizationsQuery.error.message}</p> : organizations.length ? <ul className="divide-y divide-line">{organizations.map((organization) => <li key={organization.id} className="py-3 first:pt-0 last:pb-0"><p className="font-medium">{organization.name || organization.id}</p><p className="mt-1 text-xs text-ink-muted">{organization.type || 'Organization'} · {organization.status || 'Status unknown'}</p></li>)}</ul> : <p className="text-sm text-ink-muted">This account doesn’t own any organizations.</p>}
          <p className="mt-3 text-xs text-ink-muted">The admin API doesn’t currently provide this user’s other organization memberships.</p>
        </CardContent></Card>
      </div>
    </SheetContent>
  </Sheet>
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
      <SheetHeader><SheetTitle>Add consumer account</SheetTitle><SheetDescription>Provide an email address, phone number, or both to create a consumer profile.</SheetDescription></SheetHeader>
      <form id="create-consumer-form" className="flex-1 space-y-4 overflow-y-auto px-6 pb-6" onSubmit={(event) => { event.preventDefault(); mutation.mutate() }}>
        <label className="block space-y-1.5 text-sm font-medium">Full name<Input autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="block space-y-1.5 text-sm font-medium">Email {!phone.trim() && <span className="font-normal text-ink-muted">(required unless phone is provided)</span>}<Input autoComplete="email" type="email" required={!phone.trim()} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="block space-y-1.5 text-sm font-medium">Phone {!email.trim() && <span className="font-normal text-ink-muted">(required unless email is provided)</span>}<Input autoComplete="tel" required={!email.trim()} value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
        <label className="block space-y-1.5 text-sm font-medium">Password <span className="font-normal text-ink-muted">(optional)</span><Input autoComplete="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {mutation.isError && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{mutation.error.message}</p>}
      </form>
      <SheetFooter className="border-t border-line"><Button type="submit" form="create-consumer-form" disabled={mutation.isPending || !name.trim() || (!email.trim() && !phone.trim())}>{mutation.isPending ? 'Creating…' : 'Create account'}</Button></SheetFooter>
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
      <div><h1 className="text-xl font-semibold tracking-tight">Consumer users</h1><p className="mt-1 max-w-2xl text-sm text-ink-muted">Review consumer accounts and manage access across Event OS.</p></div>
      <Button onClick={() => setCreateOpen(true)}>Add user</Button>
    </div>

    {statusMutation.isError && <p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">{statusMutation.error.message}</p>}

    <div className="flex flex-wrap items-center justify-between gap-3">
      <FilterTabs label="Filter users by status" value={status} onValueChange={(value) => { setStatus(value as typeof status); setPageIndex(0) }} options={[{ value: '', label: 'All' }, { value: 'guest', label: 'Guest' }, { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }]} />
      <label className="sr-only" htmlFor="user-search">Search consumer users</label><Input id="user-search" placeholder="Search name, email, phone" value={search} onChange={(event) => { setSearch(event.target.value); setPageIndex(0) }} className="sm:w-64" />
    </div>
    <Card className="gap-0 py-0">
      <CardContent className="p-0">
        <DataTable data={visibleUsers} headers={['User', 'Contact', 'Status', 'Created via', { label: 'Actions', className: 'text-right' }]} label="Consumer accounts" loading={usersQuery.isLoading} loadingMessage="Loading consumer accounts…" error={usersQuery.isError ? usersQuery.error.message : null} emptyMessage={search ? `No accounts match “${search}”. Try another search.` : status ? `No ${status} consumer accounts found.` : <div className="mx-auto max-w-sm"><p className="text-sm font-medium text-ink">No consumer accounts yet</p><p className="mt-1 text-sm text-ink-muted">Add a user to start managing consumer access.</p><Button className="mt-3" variant="outline" size="sm" onClick={() => setCreateOpen(true)}>Add first user</Button></div>} emptyClassName="h-36 text-center" pagination={{ pageIndex, pageSize, totalItems: filteredUsers.length, onPageChange: (index) => setPageIndex(Math.min(index, pageCount - 1)), onPageSizeChange: (size) => { setPageSize(size); setPageIndex(0) } }} renderRow={(user) => <TableRow key={user.id}>
                  <TableCell><div className="flex items-center gap-3"><Monogram name={user.name || 'Unnamed user'} /><div className="min-w-0"><p className="truncate font-medium text-ink">{user.name || 'Unnamed user'}</p><p className="mt-0.5 truncate text-xs text-ink-muted">{user.email || user.phone || 'No contact details'}</p></div></div></TableCell>
                  <TableCell><span className="block">{user.email || '—'}</span><span className="mt-0.5 block text-xs text-ink-muted">{user.phone || 'No phone number'}</span></TableCell>
                  <TableCell><UserStatus status={user.status} /></TableCell>
                  <TableCell>{user.createdVia || '—'}</TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-1"><AppIconAction label={`View ${user.name}`} icon={<span aria-hidden="true">↗</span>} onClick={() => setDetailsUserId(user.id)} /><AppIconAction label={`${user.status === 'active' ? 'Suspend' : 'Activate'} ${user.name}`} icon={<span aria-hidden="true">{user.status === 'active' ? 'Ⅱ' : '▶'}</span>} disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ user, nextStatus: user.status === 'active' ? 'suspended' : 'active' })} /></div></TableCell>
                </TableRow>} containerClassName="" />
      </CardContent>
    </Card>
    <CreateUserSheet open={createOpen} onOpenChange={setCreateOpen} onCreated={(id) => setDetailsUserId(id)} />
    <ConsumerDetails userId={detailsUserId} onClose={() => setDetailsUserId(null)} />
  </section>
}
