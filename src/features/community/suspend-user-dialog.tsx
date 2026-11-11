import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import { AppDatePicker } from '@/components/ui/date-picker'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useCommunityErrors } from './use-community-errors'
import { UserPicker } from './user-picker'
import { moderate } from '@/services/admin-community'
import { isoDateFromParts } from '@/lib/date-format'

export function SuspendUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { session } = useAuth(); const client = useQueryClient(); const [userId, setUserId] = useState(''); const [reason, setReason] = useState(''); const [until, setUntil] = useState<string | null>(null); const [error, setError] = useState('')
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); const minDate = isoDateFromParts(tomorrow.getFullYear(), tomorrow.getMonth() + 1, tomorrow.getDate())
  const mutation = useMutation({ mutationFn: () => moderate(session!.token, { targetType: 'user', targetId: userId, action: 'suspend_user', reason: reason.trim(), ...(until ? { until } : {}) }), onSuccess: () => { void client.invalidateQueries({ queryKey: ['community-suspensions'] }); onOpenChange(false); setUserId(''); setReason(''); setUntil(null); setError('') }, onError: err => setError(useCommunityErrors(err)) })
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Suspend a user</DialogTitle><DialogDescription>Require a reason. An end date is optional.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={e => { e.preventDefault(); mutation.mutate() }}><UserPicker value={userId} onChange={setUserId} /><label className="block space-y-1 text-sm">Reason<Input aria-label="Reason" value={reason} onChange={e => setReason(e.target.value)} required /></label><label className="block space-y-1 text-sm">Until (optional)<AppDatePicker ariaLabel="Suspension end date" value={until} onValueChange={setUntil} minDate={minDate} placeholder="No end date" /></label>{error && <p role="alert">{error}</p>}<DialogFooter><Button type="submit" disabled={!userId || !reason.trim() || mutation.isPending}>{mutation.isPending ? 'Suspending…' : 'Suspend user'}</Button></DialogFooter></form></DialogContent></Dialog>
}
