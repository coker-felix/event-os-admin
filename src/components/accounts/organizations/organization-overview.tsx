import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import type { AdminOrganization } from '@/services/admin-account-directory'
import { setAdminOrganizationStatus, updateAdminOrganization } from '@/services/admin-organizations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function OrganizationOverview({ organization }: { organization: AdminOrganization }) {
  const { session } = useAuth()
  const client = useQueryClient()
  const organizationId = organization.id
  const update = useMutation({
    mutationFn: (input: { name: string; email: string; phone: string; address: string; reason: string }) => updateAdminOrganization(session!.token, organizationId, input),
    onSuccess: async () => Promise.all([client.invalidateQueries({ queryKey: ['admin-organization', organizationId] }), client.invalidateQueries({ queryKey: ['admin-organizations'] })]),
  })
  const setStatus = useMutation({
    mutationFn: ({ status, reason }: { status: 'active' | 'suspended'; reason: string }) => setAdminOrganizationStatus(session!.token, organizationId, status, reason),
    onSuccess: async () => Promise.all([client.invalidateQueries({ queryKey: ['admin-organization', organizationId] }), client.invalidateQueries({ queryKey: ['admin-organizations'] })]),
  })
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const reason = String(form.get('reason') || '').trim()
    if (!reason) return
    update.mutate({ name: String(form.get('name') || ''), email: String(form.get('email') || ''), phone: String(form.get('phone') || ''), address: String(form.get('address') || ''), reason })
  }
  const onStatus = () => {
    const status = organization.status === 'suspended' ? 'active' : 'suspended'
    if (!window.confirm(`${status === 'suspended' ? 'Suspend' : 'Reactivate'} this organization?`)) return
    const reason = window.prompt('Reason for this status change')?.trim()
    if (reason) setStatus.mutate({ status, reason })
  }

  return <Card><CardHeader><CardTitle>Organization details · {organization.status || 'active'}</CardTitle></CardHeader><CardContent className="space-y-4">
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
      <label className="space-y-1.5 text-sm font-medium">Organization name<Input name="name" required defaultValue={organization.name || ''} /></label>
      <label className="space-y-1.5 text-sm font-medium">Email<Input name="email" type="email" defaultValue={organization.email || ''} /></label>
      <label className="space-y-1.5 text-sm font-medium">Phone<Input name="phone" defaultValue={organization.phone || ''} /></label>
      <label className="space-y-1.5 text-sm font-medium">Address<Input name="address" defaultValue={organization.address || ''} /></label>
      <label className="space-y-1.5 text-sm font-medium sm:col-span-2">Reason for edit<Input name="reason" required /></label>
      <div className="flex flex-wrap gap-2 sm:col-span-2"><Button type="submit" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save organization'}</Button><Button type="button" variant="outline" disabled={setStatus.isPending} onClick={onStatus}>{setStatus.isPending ? 'Saving…' : organization.status === 'suspended' ? 'Reactivate organization' : 'Suspend organization'}</Button></div>
      {(update.isError || setStatus.isError) && <p role="alert" className="text-sm text-danger sm:col-span-2">{update.error?.message || setStatus.error?.message}</p>}
    </form>
  </CardContent></Card>
}
