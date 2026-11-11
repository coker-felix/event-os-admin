import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuth } from '@/contexts/auth'
import { Input } from '@/components/ui/input'
import { listAdminConsumers } from '@/services/admin-users'

export function UserPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { session } = useAuth()
  const [search, setSearch] = useState('')
  const users = useQuery({ queryKey: ['community-user-picker'], queryFn: () => listAdminConsumers(session!.token), enabled: Boolean(session?.token) })
  const matches = (users.data?.users ?? []).filter(user => `${user.name ?? ''} ${user.email ?? ''} ${user.id}`.toLowerCase().includes(search.toLowerCase()))
  return <div className="space-y-2"><label className="block space-y-1 text-sm">Find user<Input aria-label="Find user" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, email or ID" /></label>{users.isLoading ? <p role="status">Loading users…</p> : users.isError ? <p role="alert">Could not load users.</p> : <label className="block space-y-1 text-sm">User<select aria-label="User" className="h-9 w-full rounded-lg border border-line bg-surface px-3" value={value} onChange={e => onChange(e.target.value)}><option value="">Select a user</option>{matches.map(user => <option key={user.id} value={user.id}>{user.name || 'Unnamed user'}{user.email ? ` · ${user.email}` : ''}</option>)}</select>{matches.length === 0 && <span className="text-xs text-ink-muted">No matching users.</span>}</label>}</div>
}
