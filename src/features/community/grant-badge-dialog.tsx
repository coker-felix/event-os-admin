import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useCommunityErrors } from './use-community-errors'
import { UserPicker } from './user-picker'
import { setBadge } from '@/services/admin-community'

export function GrantBadgeDialog({ open, onOpenChange, badge }: { open: boolean; onOpenChange: (open: boolean) => void; badge: string }) {
 const { session } = useAuth(); const client = useQueryClient(); const [userId, setUserId] = useState(''); const [confirmed, setConfirmed] = useState(false); const [error, setError] = useState('')
 const mutation = useMutation({ mutationFn: () => setBadge(session!.token, { userId, badge, grant: true }), onSuccess: () => { void client.invalidateQueries({ queryKey: ['community-badges'] }); onOpenChange(false); setUserId(''); setConfirmed(false) }, onError: err => setError(useCommunityErrors(err)) })
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Grant badge</DialogTitle><DialogDescription>Grant the {badge === 'staff' ? 'Staff' : 'Founding member'} badge to a user.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={e => { e.preventDefault(); mutation.mutate() }}><UserPicker value={userId} onChange={setUserId} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I confirm this badge grant.</label>{error && <p role="alert">{error}</p>}<DialogFooter><Button type="submit" disabled={!userId || !confirmed || mutation.isPending}>Grant badge</Button></DialogFooter></form></DialogContent></Dialog>
}
