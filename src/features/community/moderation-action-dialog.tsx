import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ModerationActionInput } from '@/services/admin-community'

export function ModerationActionDialog({ open, onOpenChange, title, targetType, targetId, action, reportId, onSubmit, pending = false }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  targetType: string
  targetId: string
  action: string
  reportId?: string
  onSubmit: (input: ModerationActionInput) => void
  pending?: boolean
}) {
  const [reason, setReason] = useState('')
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = reason.trim()
    if (!trimmed || trimmed.length > 500) return
    onSubmit({ targetType, targetId, action, reason: trimmed, ...(reportId ? { reportId } : {}) })
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Provide a reason for this moderation action.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={submit}><div className="space-y-2"><label htmlFor="moderation-reason" className="text-sm font-medium">Reason</label><textarea id="moderation-reason" required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2" /><p className="text-xs text-ink-muted">{reason.length}/500</p></div><DialogFooter><Button type="submit" disabled={!reason.trim() || reason.trim().length > 500 || pending}>{pending ? 'Submitting…' : 'Submit action'}</Button></DialogFooter></form></DialogContent></Dialog>
}
