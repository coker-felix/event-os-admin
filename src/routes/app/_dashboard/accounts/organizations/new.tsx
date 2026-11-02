import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuth } from '@/contexts/auth'
import { listAdminConsumers } from '@/services/admin-users'
import { createAdminOrganization } from '@/services/admin-account-directory'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/app/_dashboard/accounts/organizations/new')({
  validateSearch: (search: Record<string, unknown>) => ({ ownerId: typeof search.ownerId === 'string' ? search.ownerId : '' }),
  component: CreateOrganizationPage,
})

function CreateOrganizationPage() {
  const { ownerId: initialOwnerId } = Route.useSearch()
  const navigate = useNavigate()
  const { session } = useAuth()
  const [ownerId, setOwnerId] = useState(initialOwnerId)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [capabilities, setCapabilities] = useState<Array<'organize' | 'vend' | 'host'>>(['organize'])
  const [idempotencyKey, setIdempotencyKey] = useState('')
  const ownersQuery = useQuery({ queryKey: ['admin-users-for-org-owner'], queryFn: () => listAdminConsumers(session!.token), enabled: Boolean(session?.token) })
  const mutation = useMutation({
    mutationFn: (key: string) => createAdminOrganization(session!.token, { ownerId, name: name.trim(), capabilities, email: email.trim(), phone: phone.trim(), address: address.trim(), idempotencyKey: key }),
    onSuccess: async (result) => {
      const id = result.organization?.id || result.id
      if (!id) throw new Error('Organization was created but the response did not include its ID.')
      sessionStorage.setItem(`admin-onboarding-org:${id}`, JSON.stringify({ organizationId: id, ownerId, capabilities, completed: ['organization'] }))
      sessionStorage.removeItem(`admin-idempotency:create-org:${ownerId}`)
      await navigate({ to: '/app/accounts/organizations/$orgId', params: { orgId: id } })
    },
  })
  const toggleCapability = (value: 'organize' | 'vend' | 'host') => setCapabilities((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const key = idempotencyKey || sessionStorage.getItem(`admin-idempotency:create-org:${ownerId}`) || crypto.randomUUID()
    setIdempotencyKey(key)
    sessionStorage.setItem(`admin-idempotency:create-org:${ownerId}`, key)
    mutation.mutate(key)
  }
  return <section className="mx-auto max-w-3xl space-y-6">
    <header><h1 className="text-xl font-semibold tracking-tight">Create organization</h1><p className="mt-1 text-sm text-ink-muted">Choose an existing user as owner, then assign the organization capabilities it needs.</p></header>
    <Card><CardHeader><CardTitle>Organization details</CardTitle></CardHeader><CardContent><form className="space-y-5" onSubmit={submit}>
      <label className="block space-y-1.5 text-sm font-medium">Owner account<select required value={ownerId} onChange={(event) => setOwnerId(event.target.value)} disabled={ownersQuery.isLoading || ownersQuery.isError} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"><option value="">Choose a user</option>{(ownersQuery.data?.users ?? []).map((user) => <option key={user.id} value={user.id}>{user.name || user.email || user.phone || user.id} · {user.id}</option>)}</select></label>
      {ownersQuery.isLoading && <p className="text-sm text-ink-muted">Loading users…</p>}{ownersQuery.isError && <p role="alert" className="text-sm text-danger">{ownersQuery.error.message}</p>}
      <label className="block space-y-1.5 text-sm font-medium">Organization name<Input required value={name} onChange={(event) => setName(event.target.value)} /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block space-y-1.5 text-sm font-medium">Contact email<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="block space-y-1.5 text-sm font-medium">Contact phone<Input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></label></div>
      <label className="block space-y-1.5 text-sm font-medium">Address<Input value={address} onChange={(event) => setAddress(event.target.value)} /></label>
      <fieldset className="space-y-2"><legend className="text-sm font-medium">Capabilities</legend>{([['organize','Organize events'],['vend','Provide vendor services'],['host','Host events at venues']] as const).map(([value,label]) => <label key={value} className="flex items-center gap-3 rounded-lg border border-line p-3 text-sm"><input type="checkbox" checked={capabilities.includes(value)} onChange={() => toggleCapability(value)} />{label}</label>)}</fieldset>
      {mutation.isError && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{mutation.error.message} You can retry safely; this form keeps the same request key.</p>}
      <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => navigate({ to: '/app/accounts/organizations' })}>Cancel</Button><Button type="submit" disabled={mutation.isPending || !ownerId || !name.trim() || capabilities.length === 0}>{mutation.isPending ? 'Creating…' : 'Create organization'}</Button></div>
    </form></CardContent></Card>
  </section>
}
