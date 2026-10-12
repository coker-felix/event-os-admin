import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, Pause, Play, Trash, UserPlus, X } from '@phosphor-icons/react'
import { useAuth } from '@/contexts/auth'
import { AppIconAction } from '@/components/ui/app-icon-action'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { TableCell, TableRow } from '@/components/ui/table'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  assignAdminRole, createAdmin, deleteAdmin, listAdminRoles, listAdmins, listRoles,
  removeAdminRole, setAdminStatus, type AdminRole, type AdminUser,
} from '@/services/admin-rbac'

const adminKeys = {
  all: ['qk-admins'] as const,
  roles: (id: string) => ['qk-admins', id, 'roles'] as const,
  roleCatalog: ['qk-admin-role-catalog'] as const,
}

function ErrorMessage({ message }: { message: string }) {
  return <p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">{message}</p>
}

function RoleAssignmentDialog({ admin, open, onOpenChange }: { admin: AdminUser | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [error, setError] = useState('')
  const id = admin?.id ?? ''
  const assignedQuery = useQuery({
    queryKey: adminKeys.roles(id),
    queryFn: () => listAdminRoles(session!.token, id),
    enabled: Boolean(session?.token && id && open),
  })
  const catalogQuery = useQuery({
    queryKey: adminKeys.roleCatalog,
    queryFn: () => listRoles(session!.token, 'platform'),
    enabled: Boolean(session?.token && open),
  })
  const assign = useMutation({
    mutationFn: (roleId: string) => assignAdminRole(session!.token, id, roleId),
    onSuccess: async () => {
      setSelectedRoleId('')
      setError('')
      await queryClient.invalidateQueries({ queryKey: adminKeys.roles(id) })
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : 'Could not assign this role.'),
  })
  const remove = useMutation({
    mutationFn: (roleId: string) => removeAdminRole(session!.token, id, roleId),
    onSuccess: async () => {
      setError('')
      await queryClient.invalidateQueries({ queryKey: adminKeys.roles(id) })
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : 'Could not remove this role.'),
  })
  const assigned = assignedQuery.data?.roles ?? []
  const assignedIds = new Set(assigned.map((role) => role.id))
  const available = (catalogQuery.data?.roles ?? []).filter((role) => !assignedIds.has(role.id))

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[min(85vh,720px)] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Roles for {admin?.name}</DialogTitle>
        <DialogDescription>Grant or remove platform roles for this staff account.</DialogDescription>
      </DialogHeader>
      {error && <ErrorMessage message={error} />}
      {assignedQuery.isLoading || catalogQuery.isLoading ? <p className="text-sm text-ink-muted">Loading role assignments…</p> : null}
      {assignedQuery.isError && <ErrorMessage message={assignedQuery.error.message} />}
      {catalogQuery.isError && <ErrorMessage message={catalogQuery.error.message} />}
      {!assignedQuery.isLoading && !catalogQuery.isLoading && !assignedQuery.isError && !catalogQuery.isError && <>
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Assigned roles</h3>
          {assigned.length ? assigned.map((role) => <div key={role.id} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5">
            <div className="min-w-0 flex-1"><p className="text-sm font-medium">{role.name}</p><p className="text-xs text-ink-muted">{role.description || role.scope}</p></div>
            <AppIconAction label={`Remove ${role.name} role`} icon={<X size={16} />} disabled={remove.isPending} onClick={() => remove.mutate(role.id)} />
          </div>) : <p className="rounded-lg bg-surface-muted px-3 py-3 text-sm text-ink-muted">No roles assigned yet.</p>}
        </div>
        <form className="space-y-3 border-t border-line pt-4" onSubmit={(event) => { event.preventDefault(); if (selectedRoleId) assign.mutate(selectedRoleId) }}>
          <label htmlFor="assign-role" className="block text-sm font-medium">Add a platform role</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select id="assign-role" value={selectedRoleId} onChange={(event) => setSelectedRoleId(event.target.value)} className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand">
              <option value="">Choose a role</option>
              {available.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </select>
            <Button type="submit" disabled={!selectedRoleId || assign.isPending}><UserPlus size={16} />{assign.isPending ? 'Adding…' : 'Add role'}</Button>
          </div>
          {!available.length && <p className="text-xs text-ink-muted">All available platform roles are assigned.</p>}
        </form>
      </>}
      <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Done</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}

export function StaffAdminsPage() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [rolesAdmin, setRolesAdmin] = useState<AdminUser | null>(null)
  const [pendingDelete, setPendingDelete] = useState<AdminUser | null>(null)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const adminsQuery = useQuery({
    queryKey: adminKeys.all,
    queryFn: () => listAdmins(session!.token),
    enabled: Boolean(session?.token),
  })
  const refreshAdmins = () => queryClient.invalidateQueries({ queryKey: adminKeys.all })
  const statusMutation = useMutation({
    mutationFn: ({ admin, status }: { admin: AdminUser; status: 'active' | 'suspended' }) => setAdminStatus(session!.token, admin.id, status),
    onSuccess: async () => { setError(''); await refreshAdmins() },
    onError: (cause) => setError(cause instanceof Error ? cause.message : 'Could not update this account.'),
  })
  const deleteMutation = useMutation({
    mutationFn: (admin: AdminUser) => deleteAdmin(session!.token, admin.id),
    onSuccess: async () => { setPendingDelete(null); setError(''); await refreshAdmins() },
    onError: (cause) => setError(cause instanceof Error ? cause.message : 'Could not remove this account.'),
  })
  const createMutation = useMutation({
    mutationFn: (input: { name: string; email: string; password: string }) => createAdmin(session!.token, input),
    onSuccess: async () => { setCreateOpen(false); setFormError(''); await refreshAdmins() },
    onError: (cause) => setFormError(cause instanceof Error ? cause.message : 'Could not create this account.'),
  })
  const filteredAdmins = useMemo(() => (adminsQuery.data?.admins ?? []).filter((admin) =>
    `${admin.name} ${admin.email}`.toLowerCase().includes(search.trim().toLowerCase())), [adminsQuery.data?.admins, search])
  const pageCount = Math.max(1, Math.ceil(filteredAdmins.length / pageSize))
  const visibleAdmins = filteredAdmins.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    createMutation.mutate({
      name: String(values.get('name') ?? '').trim(),
      email: String(values.get('email') ?? '').trim(),
      password: String(values.get('password') ?? ''),
    })
  }

  return <section className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Staff & access</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Admin users</h1><p className="mt-2 max-w-2xl text-sm text-ink-muted">Create staff accounts and control the platform roles they hold.</p></div>
      <Button onClick={() => { setFormError(''); setCreateOpen(true) }}><UserPlus size={16} />Add admin</Button>
    </div>
    {error && <ErrorMessage message={error} />}
    <Card>
      <CardContent className="p-0">
        <div className="flex justify-end p-4"><input aria-label="Search admin users" placeholder="Search name or email" value={search} onChange={(event) => { setSearch(event.target.value); setPageIndex(0) }} className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/30 sm:w-64" /></div>
        <DataTable data={visibleAdmins} headers={['Admin', 'Status', { label: 'Actions', className: 'text-right' }]} label="Staff accounts" loading={adminsQuery.isLoading} loadingMessage="Loading staff accounts…" error={adminsQuery.isError ? adminsQuery.error.message : null} emptyMessage={filteredAdmins.length ? 'No admins on this page.' : search ? 'No admins match your search.' : 'No staff accounts yet.'} pagination={{ pageIndex, pageSize, totalItems: filteredAdmins.length, onPageChange: (index) => setPageIndex(Math.min(index, pageCount - 1)), onPageSizeChange: (size) => { setPageSize(size); setPageIndex(0) } }} renderRow={(admin) => <TableRow key={admin.id}>
                <TableCell><div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">{admin.name.trim().slice(0, 1).toUpperCase() || '?'}</span><span className="min-w-0"><span className="block truncate font-medium text-ink">{admin.name}</span><span className="block truncate text-xs text-ink-muted">{admin.email}</span></span></div></TableCell>
                <TableCell>{admin.status === 'active' ? <Badge className="bg-success-soft text-success">Active</Badge> : <Badge variant="outline">{admin.status || 'Unknown'}</Badge>}</TableCell>
                <TableCell className="text-right"><div className="flex justify-end gap-1">
                  <AppIconAction label={`Manage roles for ${admin.name}`} icon={<ShieldCheck size={16} />} onClick={() => setRolesAdmin(admin)} showLabel />
                  <AppIconAction label={admin.status === 'active' ? `Suspend ${admin.name}` : `Reactivate ${admin.name}`} icon={admin.status === 'active' ? <Pause size={16} /> : <Play size={16} />} disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ admin, status: admin.status === 'active' ? 'suspended' : 'active' })} />
                  <AppIconAction label={`Remove ${admin.name}`} icon={<Trash size={16} />} disabled={deleteMutation.isPending} onClick={() => setPendingDelete(admin)} />
                </div></TableCell>
              </TableRow>} containerClassName="" />
      </CardContent>
    </Card>

    <Sheet open={createOpen} onOpenChange={setCreateOpen}><SheetContent className="w-full overflow-y-auto sm:max-w-lg">
      <SheetHeader><SheetTitle>Add an admin</SheetTitle><SheetDescription>Create a staff login. You can assign platform roles after creating the account.</SheetDescription></SheetHeader>
      <form id="create-admin-form" className="flex-1 space-y-4 overflow-y-auto px-6 pb-6" onSubmit={submitCreate}>
        <label className="block space-y-1.5 text-sm font-medium">Full name<Input name="name" autoComplete="name" required maxLength={120} /></label>
        <label className="block space-y-1.5 text-sm font-medium">Email address<Input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
        <label className="block space-y-1.5 text-sm font-medium">Temporary password<Input name="password" type="password" autoComplete="new-password" required minLength={8} /><span className="block text-xs font-normal text-ink-muted">At least 8 characters. Share it securely and ask the admin to change it.</span></label>
        {formError && <ErrorMessage message={formError} />}
      </form>
      <SheetFooter className="border-t border-line"><Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="submit" form="create-admin-form" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating…' : 'Create admin'}</Button></SheetFooter>
    </SheetContent></Sheet>

    <RoleAssignmentDialog admin={rolesAdmin} open={Boolean(rolesAdmin)} onOpenChange={(open) => { if (!open) setRolesAdmin(null) }} />
    <Dialog open={Boolean(pendingDelete)} onOpenChange={(open) => { if (!open) setPendingDelete(null) }}><DialogContent>
      <DialogHeader><DialogTitle>Remove admin account?</DialogTitle><DialogDescription>This permanently removes {pendingDelete?.name} and their role assignments. This cannot be undone.</DialogDescription></DialogHeader>
      {error && <ErrorMessage message={error} />}
      <DialogFooter><Button type="button" variant="outline" onClick={() => setPendingDelete(null)}>Cancel</Button><Button type="button" variant="destructive" disabled={deleteMutation.isPending} onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete)}>{deleteMutation.isPending ? 'Removing…' : 'Remove admin'}</Button></DialogFooter>
    </DialogContent></Dialog>
  </section>
}
