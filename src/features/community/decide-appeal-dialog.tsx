import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function DecideAppealDialog({ open, onOpenChange, onSubmit, pending }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (decision: 'uphold' | 'reverse', note: string) => void
  pending: boolean
}) {
  const [decision, setDecision] = useState<'uphold' | 'reverse'>('uphold')
  const [note, setNote] = useState('')
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Decide appeal</DialogTitle><DialogDescription>Choose whether to uphold or reverse the original moderation action. A note is required.</DialogDescription></DialogHeader>
    <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (note.trim()) onSubmit(decision, note.trim()) }}>
      <label className="block space-y-1.5 text-sm font-medium">Decision<select value={decision} onChange={(event) => setDecision(event.target.value as 'uphold' | 'reverse')} className="h-10 w-full rounded-lg border border-line bg-surface px-3"><option value="uphold">Uphold</option><option value="reverse">Reverse</option></select></label>
      <label className="block space-y-1.5 text-sm font-medium" htmlFor="appeal-note">Decision note<textarea id="appeal-note" required maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2" /></label>
      <DialogFooter><Button type="submit" disabled={!note.trim() || pending}>{pending ? 'Submitting…' : 'Submit decision'}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>
}
