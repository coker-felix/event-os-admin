import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import { listOrganizationMembers } from '@/services/admin-account-directory'
import { getOrganizationMemberPermissions, inviteOrganizationMember, listOrganizationInvites, removeOrganizationMember, revokeOrganizationInvite, setOrganizationMemberRole, setOrganizationMemberStatus } from '@/services/admin-organizations'
import { listRoles } from '@/services/admin-rbac'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const scopeForCapability: Record<string, 'organizer' | 'vendor' | 'venue'> = { organize: 'organizer', vend: 'vendor', host: 'venue' }

export function OrganizationMembers({ organizationId, ownerId, capabilities }: { organizationId: string; ownerId?: string | null; capabilities: Array<{ capability: string } | null> }) {
  const { session } = useAuth()
  const client = useQueryClient()
  const scopes = capabilities.flatMap((capability) => capability?.capability && scopeForCapability[capability.capability] ? [scopeForCapability[capability.capability]] : [])
  const [scope, setScope] = useState(scopes[0] || 'organizer')
  const [destination, setDestination] = useState('')
  const [roleId, setRoleId] = useState('')
  const [permissionUserId, setPermissionUserId] = useState('')
  useEffect(() => { if (scopes.length && !scopes.includes(scope as typeof scopes[number])) setScope(scopes[0]) }, [scopes.join('|'), scope])
  const membersQuery = useQuery({ queryKey: ['admin-organization-members', organizationId, scope], queryFn: () => listOrganizationMembers(session!.token, organizationId, scope), enabled: Boolean(session?.token && scopes.includes(scope as typeof scopes[number])) })
  const invitesQuery = useQuery({ queryKey: ['admin-organization-invites', organizationId, scope], queryFn: () => listOrganizationInvites(session!.token, organizationId, scope), enabled: Boolean(session?.token && scopes.includes(scope as typeof scopes[number])) })
  const rolesQuery = useQuery({ queryKey: ['admin-organization-roles', scope], queryFn: () => listRoles(session!.token, scope), enabled: Boolean(session?.token && scopes.includes(scope as typeof scopes[number])) })
  const roles = rolesQuery.data?.roles ?? []
  const members = membersQuery.data?.members ?? []
  const permissionMember = members.find((member) => member.userId === permissionUserId) ?? members.find((member) => member.userId === ownerId) ?? members[0]
  const permissionsQuery = useQuery({ queryKey: ['admin-organization-permissions', organizationId, scope, permissionMember?.userId], queryFn: () => getOrganizationMemberPermissions(session!.token, organizationId, permissionMember!.userId!, scope), enabled: Boolean(session?.token && permissionMember?.userId && scopes.includes(scope as typeof scopes[number])) })
  useEffect(() => { if (!roleId && roles.length) setRoleId(roles.find((role) => !role.code.endsWith('_owner'))?.code || '') }, [roles, roleId])
  const invalidate = async () => Promise.all([client.invalidateQueries({ queryKey: ['admin-organization-members', organizationId, scope] }), client.invalidateQueries({ queryKey: ['admin-organization-invites', organizationId, scope] }), client.invalidateQueries({ queryKey: ['admin-organization-permissions', organizationId, scope] })])
  const inviteMutation = useMutation({ mutationFn: () => inviteOrganizationMember(session!.token, organizationId, { destination: destination.trim(), roleId, scope }), onSuccess: async () => { setDestination(''); await invalidate() } })
  const roleMutation = useMutation({ mutationFn: ({ userId, role }: { userId: string; role: string }) => setOrganizationMemberRole(session!.token, organizationId, userId, role, scope), onSuccess: invalidate })
  const statusMutation = useMutation({ mutationFn: ({ userId, status }: { userId: string; status: string }) => setOrganizationMemberStatus(session!.token, organizationId, userId, status, scope), onSuccess: invalidate })
  const removeMutation = useMutation({ mutationFn: (userId: string) => removeOrganizationMember(session!.token, organizationId, userId, scope), onSuccess: invalidate })
  const revokeMutation = useMutation({ mutationFn: (inviteId: string) => revokeOrganizationInvite(session!.token, organizationId, inviteId, scope), onSuccess: invalidate })
  const error = inviteMutation.error || roleMutation.error || statusMutation.error || removeMutation.error || revokeMutation.error
  return <div className="space-y-5">
    <label className="block max-w-sm space-y-1.5 text-sm font-medium">Membership scope<select aria-label="Membership scope" value={scope} onChange={(event) => { setScope(event.target.value as typeof scope); setRoleId('') }} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm">{scopes.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
    {error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error.message}</p>}
    <Card><CardHeader><CardTitle>Invite a member</CardTitle></CardHeader><CardContent><form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => { event.preventDefault(); inviteMutation.mutate() }}>
      <label className="space-y-1.5 text-sm font-medium">Phone number<Input type="tel" required value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="+233…" /></label>
      <label className="space-y-1.5 text-sm font-medium">Role<select aria-label="Invite role" required value={roleId} onChange={(event) => setRoleId(event.target.value)} disabled={rolesQuery.isLoading || roles.length === 0} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm">{roles.filter((role) => !role.code.endsWith('_owner')).map((role) => <option value={role.code} key={role.id}>{role.name}</option>)}</select></label>
      <div className="flex items-end"><Button type="submit" disabled={inviteMutation.isPending || !destination.trim() || !roleId}>{inviteMutation.isPending ? 'Sending…' : 'Send invite'}</Button></div>
    </form>{rolesQuery.isError && <p role="alert" className="mt-3 text-sm text-danger">{rolesQuery.error.message}</p>}</CardContent></Card>
    <Card><CardHeader><CardTitle>Effective permissions · {scope}</CardTitle></CardHeader><CardContent className="space-y-3">
      {members.length > 0 && <label className="block max-w-sm space-y-1.5 text-sm font-medium">Permission member<select aria-label="Permission member" value={permissionMember?.userId || ''} onChange={(event) => setPermissionUserId(event.target.value)} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm">{members.map((member) => <option key={member.userId || member.id} value={member.userId || member.id || ''}>{member.name || member.userId}</option>)}</select></label>}
      {permissionsQuery.isLoading && <p className="text-sm text-ink-muted">Loading effective permissions…</p>}
      {permissionsQuery.isError && <p role="alert" className="text-sm text-danger">{permissionsQuery.error.message}</p>}
      {!permissionsQuery.isLoading && !permissionsQuery.isError && <><p className="text-sm text-ink-muted">{permissionsQuery.data?.roleName || permissionsQuery.data?.roleId || 'No active role'} · organization {permissionsQuery.data?.orgStatus || 'unknown'}</p>{(permissionsQuery.data?.permissions ?? []).length ? <ul aria-label="Effective permissions" className="flex flex-wrap gap-2">{permissionsQuery.data?.permissions?.map((permission) => <li key={permission} className="rounded-md bg-surface-muted px-2 py-1 font-mono text-xs">{permission}</li>)}</ul> : <p className="text-sm text-ink-muted">No effective permissions in this scope.</p>}</>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Members · {scope}</CardTitle></CardHeader><CardContent>
      {membersQuery.isLoading ? <p className="py-5 text-center text-sm text-ink-muted">Loading members…</p> : membersQuery.isError ? <p role="alert" className="text-sm text-danger">{membersQuery.error.message}</p> : (membersQuery.data?.members ?? []).length ? <ul className="divide-y divide-line">{(membersQuery.data?.members ?? []).map((member, index) => { const isOwner = member.userId === ownerId; return <li key={`${member.userId || member.id}-${index}`} className="flex flex-wrap items-center gap-3 py-3"><div className="min-w-48 flex-1"><p className="text-sm font-medium">{member.name || member.userId || 'Unnamed member'}{isOwner ? ' · Owner' : ''}</p><p className="text-xs text-ink-muted">{member.phone || member.userId || 'No contact details'} · {member.status || 'unknown'}</p></div><select aria-label={`Role for ${member.name || member.userId}`} value={member.roleId || ''} disabled={isOwner || roleMutation.isPending} onChange={(event) => roleMutation.mutate({ userId: member.userId || member.id || '', role: event.target.value })} className="h-9 rounded-lg border border-line bg-surface px-2 text-sm">{roles.filter((role) => !role.code.endsWith('_owner') || role.code === member.roleId).map((role) => <option value={role.code} key={role.id}>{role.name}</option>)}</select>{!isOwner && <><Button size="sm" variant="outline" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ userId: member.userId || member.id || '', status: member.status === 'active' ? 'suspended' : 'active' })}>{member.status === 'active' ? 'Suspend' : 'Reactivate'}</Button><Button size="sm" variant="outline" disabled={removeMutation.isPending} onClick={() => { if (window.confirm('Remove this member from the selected scope?')) removeMutation.mutate(member.userId || member.id || '') }}>Remove</Button></>}</li> })}</ul> : <p className="py-5 text-center text-sm text-ink-muted">No members in this scope yet.</p>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Invitations · {scope}</CardTitle></CardHeader><CardContent>{invitesQuery.isLoading ? <p className="text-sm text-ink-muted">Loading invitations…</p> : invitesQuery.isError ? <p role="alert" className="text-sm text-danger">{invitesQuery.error.message}</p> : (invitesQuery.data?.invites ?? []).length ? <ul className="divide-y divide-line">{(invitesQuery.data?.invites ?? []).map((invite) => <li key={invite.id} className="flex items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="text-sm font-medium">{invite.destination}</p><p className="text-xs text-ink-muted">{invite.roleId} · {invite.status}</p></div>{invite.status === 'pending' && <Button size="sm" variant="outline" disabled={revokeMutation.isPending} onClick={() => revokeMutation.mutate(invite.id)}>Revoke</Button>}</li>)}</ul> : <p className="text-sm text-ink-muted">No invitations for this scope.</p>}</CardContent></Card>
  </div>
}
