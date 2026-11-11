import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useCommunityErrors } from './use-community-errors'
import { upsertSkill, type Skill } from '@/services/admin-community'

export function SkillDialog({ open, onOpenChange, skill }: { open: boolean; onOpenChange: (open: boolean) => void; skill: Skill | null }) {
 const { session } = useAuth(); const client = useQueryClient(); const [name, setName] = useState(''); const [slug, setSlug] = useState(''); const [error, setError] = useState('')
 useEffect(() => { setName(skill?.name ?? ''); setSlug(skill?.slug ?? ''); setError('') }, [skill, open])
 const valid = /^[a-z0-9_]+$/.test(slug)
 const mutation = useMutation({ mutationFn: () => upsertSkill(session!.token, skill?.id ?? '', { name: name.trim(), slug }), onSuccess: () => { void client.invalidateQueries({ queryKey: ['community-skills'] }); onOpenChange(false) }, onError: err => setError(useCommunityErrors(err)) })
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{skill ? 'Edit skill' : 'Add skill'}</DialogTitle><DialogDescription>Skill slugs use lowercase letters, numbers and underscores.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={e => { e.preventDefault(); mutation.mutate() }}><label className="block space-y-1 text-sm">Name<Input aria-label="Skill name" value={name} onChange={e => setName(e.target.value)} required /></label><label className="block space-y-1 text-sm">Slug<Input aria-label="Skill slug" value={slug} onChange={e => setSlug(e.target.value)} required aria-invalid={Boolean(slug) && !valid} /></label>{slug && !valid && <p role="alert">Use lowercase letters, numbers and underscores only.</p>}{error && <p role="alert">{error}</p>}<DialogFooter><Button type="submit" disabled={!name.trim() || !valid || mutation.isPending}>Save skill</Button></DialogFooter></form></DialogContent></Dialog>
}
