import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Key, MinusCircle, Plus, PlusCircle, ShieldCheck } from '@phosphor-icons/react'
import { useAuth } from '@/contexts/auth'
import { AppIconAction } from '@/components/ui/app-icon-action'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { TableCell, TableRow } from '@/components/ui/table'
import { changeRolePermission, createPermission, createRole, listPermissions, listRolePermissions, listRoles, type AdminPermission, type AdminRole } from '@/services/admin-rbac'

const roleKeys = {
  roles: ['qk-rbac', 'roles'] as const,
  permissions: ['qk-rbac', 'permissions'] as const,
  rolePermissions: (id: string) => ['qk-rbac', 'roles', id, 'permissions'] as const,
}
const scopes = ['platform', 'organizer', 'vendor', 'venue'] as const
type Scope = typeof scopes[number]

function FormError({ message }: { message: string }) {
  return <p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">{message}</p>
}

function CreateCatalogDialog({ kind, open, onOpenChange }: { kind: 'role' | 'permission'; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: (input: { name: string; scope: string; description?: string }) => kind === 'role'
      ? createRole(session!.token, input)
      : createPermission(session!.token, input),
    onSuccess: async () => {
      setError('')
      onOpenChange(false)
      await queryClient.invalidateQueries({ queryKey: kind === 'role' ? roleKeys.roles : roleKeys.permissions })
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : `Could not create this ${kind}.`),
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const description = String(data.get('description') ?? '').trim()
    mutation.mutate({
      name: String(data.get('name') ?? '').trim(),
      scope: String(data.get('scope') ?? ''),
      ...(description ? { description } : {}),
    })
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[min(85vh,720px)] overflow-y-auto sm:max-w-lg">
    <DialogHeader><DialogTitle>Create {kind}</DialogTitle><DialogDescription>{kind === 'role' ? 'Add a named role within one access scope.' : 'Add a permission that can be granted to a role in the same scope.'}</DialogDescription></DialogHeader>
    <form id={`create-${kind}-form`} className="space-y-4" onSubmit={submit}>
      <label className="block space-y-1.5 text-sm font-medium">Name<Input name="name" placeholder={kind === 'role' ? 'event_reviewer' : 'platform.events.read'} required maxLength={120} /></label>
      <label className="block space-y-1.5 text-sm font-medium">Scope<select name="scope" required defaultValue="platform" className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand">{scopes.map((scope) => <option key={scope} value={scope}>{scope}</option>)}</select></label>
      <label className="block space-y-1.5 text-sm font-medium">Description <span className="font-normal text-ink-muted">(optional)</span><textarea name="description" rows={3} maxLength={500} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/30" /></label>
      {error && <FormError message={error} />}
    </form>
    <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" form={`create-${kind}-form`} disabled={mutation.isPending}>{mutation.isPending ? 'Creating…' : `Create ${kind}`}</Button></DialogFooter>
  </DialogContent></Dialog>
}

function RolePermissionsDialog({ role, open, onOpenChange, permissions, permissionsLoading, permissionsError }: { role: AdminRole | null; open: boolean; onOpenChange: (open: boolean) => void; permissions: AdminPermission[]; permissionsLoading: boolean; permissionsError: string }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const roleId = role?.id ?? ''
  const rolePermissionsQuery = useQuery({
    queryKey: roleKeys.rolePermissions(roleId),
    queryFn: () => listRolePermissions(session!.token, roleId),
    enabled: Boolean(session?.token && roleId && open),
  })
  const assigned = rolePermissionsQuery.data?.permissions ?? []
  const assignedIds = new Set(assigned.map((permission) => permission.id))
  const available = permissions.filter((permission) => permission.scope === role?.scope && !assignedIds.has(permission.id))
  const mutation = useMutation({
    mutationFn: ({ permissionId, operation }: { permissionId: string; operation: 'grant' | 'revoke' }) => changeRolePermission(session!.token, roleId, permissionId, operation),
    onSuccess: async () => {
      setError('')
      await queryClient.invalidateQueries({ queryKey: roleKeys.rolePermissions(roleId) })
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : 'Could not update this role permission.'),
  })

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[min(85vh,760px)] overflow-y-auto sm:max-w-2xl">
    <DialogHeader><DialogTitle>Permissions for {role?.name}</DialogTitle><DialogDescription>{role?.description || `Manage capabilities granted to this ${role?.scope} role.`}</DialogDescription></DialogHeader>
    {error && <FormError message={error} />}
    {rolePermissionsQuery.isLoading ? <p className="py-6 text-center text-sm text-ink-muted">Loading assigned permissions…</p>
      : rolePermissionsQuery.isError ? <FormError message={rolePermissionsQuery.error.message} />
        : <div className="grid gap-6 sm:grid-cols-2">
          <section className="space-y-2" aria-labelledby="assigned-permissions-heading">
            <div className="flex items-center justify-between"><h3 id="assigned-permissions-heading" className="text-sm font-semibold">Assigned</h3><Badge variant="outline">{assigned.length}</Badge></div>
            {assigned.length ? assigned.map((permission) => <div key={permission.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2.5"><div className="min-w-0 flex-1"><p className="break-all text-sm font-medium">{permission.name}</p><p className="mt-0.5 text-xs text-ink-muted">{permission.description || permission.scope}</p></div><AppIconAction label={`Revoke ${permission.name}`} icon={<MinusCircle size={16} />} disabled={mutation.isPending} onClick={() => mutation.mutate({ permissionId: permission.id, operation: 'revoke' })} /></div>) : <p className="rounded-lg bg-surface-muted px-3 py-4 text-sm text-ink-muted">No permissions assigned to this role.</p>}
          </section>
          <section className="space-y-2" aria-labelledby="available-permissions-heading">
            <div className="flex items-center justify-between"><h3 id="available-permissions-heading" className="text-sm font-semibold">Available to grant</h3><Badge variant="outline">{available.length}</Badge></div>
            {permissionsLoading ? <p className="rounded-lg bg-surface-muted px-3 py-4 text-sm text-ink-muted">Loading permission catalog…</p>
              : permissionsError ? <FormError message={permissionsError} />
                : available.length ? available.map((permission) => <div key={permission.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2.5"><div className="min-w-0 flex-1"><p className="break-all text-sm font-medium">{permission.name}</p><p className="mt-0.5 text-xs text-ink-muted">{permission.description || permission.scope}</p></div><AppIconAction label={`Grant ${permission.name}`} icon={<PlusCircle size={16} />} disabled={mutation.isPending} onClick={() => mutation.mutate({ permissionId: permission.id, operation: 'grant' })} /></div>) : <p className="rounded-lg bg-surface-muted px-3 py-4 text-sm text-ink-muted">Every permission in this scope is already assigned.</p>}
          </section>
        </div>}
    <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Done</Button></DialogFooter>
  </DialogContent></Dialog>
}

export function StaffRolesPage() {
  const { session } = useAuth()
  const [scope, setScope] = useState<'all' | Scope>('all')
  const [tab, setTab] = useState('roles')
  const [createOpen, setCreateOpen] = useState(false)
  const [permissionsRole, setPermissionsRole] = useState<AdminRole | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const rolesQuery = useQuery({ queryKey: roleKeys.roles, queryFn: () => listRoles(session!.token), enabled: Boolean(session?.token) })
  const permissionsQuery = useQuery({ queryKey: roleKeys.permissions, queryFn: () => listPermissions(session!.token), enabled: Boolean(session?.token) })
  const roles = rolesQuery.data?.roles ?? []
  const permissions = permissionsQuery.data?.permissions ?? []
  const filtered = useMemo(() => (tab === 'roles' ? roles : permissions).filter((item) => scope === 'all' || item.scope === scope), [permissions, roles, scope, tab])
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
  const query = tab === 'roles' ? rolesQuery : permissionsQuery

  return <section className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-xl font-semibold tracking-tight">Roles & permissions</h1><p className="mt-1 max-w-2xl text-sm text-ink-muted">Define access roles and the permission catalog used across Event OS.</p></div>
      <div className="flex flex-wrap gap-2"><Button onClick={() => setCreateOpen(true)}><Plus size={16} />Add {tab === 'roles' ? 'role' : 'permission'}</Button></div>
    </div>
    <div role="tablist" aria-label="RBAC catalog" className="flex w-fit items-center rounded-xl bg-surface-muted p-1" onKeyDown={(event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      const next = event.key === 'Home' ? 'roles' : event.key === 'End' ? 'permissions' : tab === 'roles' ? 'permissions' : 'roles'
      setTab(next)
      setPageIndex(0)
      document.getElementById(`rbac-tab-${next}`)?.focus()
    }}>
      {(['roles', 'permissions'] as const).map((value) => <button key={value} id={`rbac-tab-${value}`} type="button" role="tab" tabIndex={tab === value ? 0 : -1} aria-selected={tab === value} aria-controls="rbac-catalog-panel" onClick={() => { setTab(value); setPageIndex(0) }} className={`rounded-lg px-3 py-2 text-sm font-medium capitalize transition-colors ${tab === value ? 'bg-surface text-brand shadow-sm' : 'text-ink-muted hover:text-ink'}`}>{value}</button>)}
    </div>
    <section id="rbac-catalog-panel" role="tabpanel" aria-labelledby={`rbac-tab-${tab}`} tabIndex={0} className="space-y-4 outline-none focus-visible:ring-2 focus-visible:ring-brand/30">
      <div className="flex flex-wrap items-center justify-end gap-3">
      <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">Scope<select value={scope} onChange={(event) => { setScope(event.target.value as 'all' | Scope); setPageIndex(0) }} className="h-9 rounded-lg border border-line bg-surface px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-brand"><option value="all">All scopes</option>{scopes.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      </div>
      <Card className="gap-0 py-0">
      <CardContent className="p-0">
        <DataTable data={visible} headers={['Name', 'Scope', 'Description', ...(tab === 'roles' ? [{ label: 'Access', className: 'text-right' }] : [])]} label={tab === 'roles' ? 'Role catalog' : 'Permission catalog'} loading={query.isLoading} loadingMessage={`Loading ${tab}…`} error={query.isError ? query.error.message : null} emptyMessage={`No ${tab} found for this scope.`} pagination={{ pageIndex, pageSize, totalItems: filtered.length, onPageChange: (index) => setPageIndex(Math.min(index, pageCount - 1)), onPageSizeChange: (size) => { setPageSize(size); setPageIndex(0) } }} renderRow={(item) => <TableRow key={item.id}>
                <TableCell><span className="flex items-center gap-2 font-medium"><span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand">{tab === 'roles' ? <ShieldCheck size={16} /> : <Key size={16} />}</span>{item.name}</span></TableCell>
                <TableCell><Badge variant="outline">{item.scope}</Badge></TableCell>
                <TableCell className="max-w-[34rem] whitespace-normal text-ink-muted">{item.description || '—'}</TableCell>
                {tab === 'roles' && <TableCell className="text-right"><div className="flex justify-end"><AppIconAction label={`Manage permissions for ${item.name}`} icon={<ShieldCheck size={16} />} showLabel onClick={() => setPermissionsRole(item as AdminRole)} /></div></TableCell>}
              </TableRow>} containerClassName="" />
      </CardContent>
      </Card>
    </section>
    <CreateCatalogDialog kind={tab === 'roles' ? 'role' : 'permission'} open={createOpen} onOpenChange={setCreateOpen} />
    <RolePermissionsDialog role={permissionsRole} open={Boolean(permissionsRole)} onOpenChange={(open) => { if (!open) setPermissionsRole(null) }} permissions={permissions} permissionsLoading={permissionsQuery.isLoading} permissionsError={permissionsQuery.error?.message ?? ''} />
  </section>
}
