import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth'
import { AppIconAction } from '@/components/ui/app-icon-action'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { TableCell, TableRow } from '@/components/ui/table'
import { createVendorServiceCatalogEntry, disableVendorServiceCatalogEntry, listVendorServiceCatalog, updateVendorServiceCatalogEntry, type VendorServiceCatalogEntry } from '@/services/admin-service-catalog'

const catalogKey = ['qk-admin-vendor-service-catalog'] as const
type Draft = { kind: string; name: string; description: string; sortOrder: string; enabled: boolean }

function slug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64)
}

export function PlatformVendorServicesPage() {
  const { session } = useAuth()
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<VendorServiceCatalogEntry | null>(null)
  const [draft, setDraft] = useState<Draft>({ kind: '', name: '', description: '', sortOrder: '0', enabled: true })
  const query = useQuery({ queryKey: catalogKey, queryFn: () => listVendorServiceCatalog(session!.token, true), enabled: Boolean(session?.token) })
  const refresh = () => client.invalidateQueries({ queryKey: catalogKey })
  const save = useMutation({
    mutationFn: () => editing
      ? updateVendorServiceCatalogEntry(session!.token, editing.kind, { name: draft.name.trim(), description: draft.description.trim(), enabled: draft.enabled, sortOrder: Number(draft.sortOrder) })
      : createVendorServiceCatalogEntry(session!.token, { kind: slug(draft.kind), name: draft.name.trim(), description: draft.description.trim(), sortOrder: Number(draft.sortOrder) }),
    onSuccess: async () => { await refresh(); setOpen(false); toast.success('Service type saved.') },
    onError: (error: Error) => toast.error(error.message),
  })
  const toggle = useMutation({
    mutationFn: (entry: VendorServiceCatalogEntry) => entry.enabled
      ? disableVendorServiceCatalogEntry(session!.token, entry.kind)
      : updateVendorServiceCatalogEntry(session!.token, entry.kind, { name: entry.name, description: entry.description || '', enabled: true, sortOrder: entry.sortOrder || 0 }),
    onSuccess: async () => { await refresh(); toast.success('Service type status updated.') },
    onError: (error: Error) => toast.error(error.message),
  })
  const edit = (entry?: VendorServiceCatalogEntry) => {
    setEditing(entry ?? null)
    setDraft({ kind: entry?.kind ?? '', name: entry?.name ?? '', description: entry?.description ?? '', sortOrder: String(entry?.sortOrder ?? 0), enabled: entry?.enabled ?? true })
    save.reset(); setOpen(true)
  }
  const rows = query.data?.services ?? []
  return <section className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-xl font-semibold tracking-tight">Vendor services</h1><p className="mt-1 max-w-2xl text-sm text-ink-muted">Manage the service types vendors can list and organizers can request. Disabled types remain on existing records.</p></div><Button onClick={() => edit()}>Add service type</Button></div>
    <Card className="gap-0 py-0"><CardContent className="p-0"><DataTable data={rows} headers={['Service type', 'Key', 'Description', 'Status', { label: 'Actions', className: 'text-right' }]} label="Vendor service catalog" loading={query.isLoading} loadingMessage="Loading service types…" error={query.isError ? query.error.message : null} emptyMessage="No service types are configured." renderRow={(entry) => <TableRow key={entry.kind}><TableCell className="font-medium">{entry.name}</TableCell><TableCell className="font-mono text-xs">{entry.kind}</TableCell><TableCell>{entry.description || '—'}</TableCell><TableCell>{entry.enabled ? <Badge className="bg-success-soft text-success">Enabled</Badge> : <Badge variant="outline">Disabled</Badge>}</TableCell><TableCell className="text-right"><div className="flex justify-end gap-1"><AppIconAction label={`Edit ${entry.name}`} icon={<span aria-hidden="true">✎</span>} onClick={() => edit(entry)} /><AppIconAction label={`${entry.enabled ? 'Disable' : 'Enable'} ${entry.name}`} icon={<span aria-hidden="true">{entry.enabled ? 'Ⅱ' : '▶'}</span>} disabled={toggle.isPending} onClick={() => toggle.mutate(entry)} /></div></TableCell></TableRow>} containerClassName="" /></CardContent></Card>
    <Sheet open={open} onOpenChange={setOpen}><SheetContent><SheetHeader><SheetTitle>{editing ? 'Edit service type' : 'Add service type'}</SheetTitle><SheetDescription>New enabled types become available in vendor service and callout forms.</SheetDescription></SheetHeader><form id="vendor-service-catalog-form" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); save.mutate() }} className="flex-1 space-y-4 overflow-y-auto px-6 pb-6">
      {!editing && <label className="block space-y-1.5 text-sm font-medium">Service name<Input required maxLength={120} value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value, kind: slug(event.target.value) }))} placeholder="e.g. Portable lighting" /></label>}
      {editing && <label className="block space-y-1.5 text-sm font-medium">Service name<Input required maxLength={120} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>}
      {!editing && <label className="block space-y-1.5 text-sm font-medium">Service key<Input required maxLength={64} pattern="[a-z][a-z0-9_]*" value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: slug(event.target.value) })} /><span className="text-xs font-normal text-ink-muted">Generated from the name; used as the stable service identifier.</span></label>}
      <label className="block space-y-1.5 text-sm font-medium">Description<Input maxLength={500} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
      <label className="block space-y-1.5 text-sm font-medium">Display order<Input type="number" min="0" step="1" value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })} /></label>
      {editing && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} /> Enabled</label>}
      {save.isError && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{save.error.message}</p>}
    </form><SheetFooter className="border-t border-line"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" form="vendor-service-catalog-form" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save service type'}</Button></SheetFooter></SheetContent></Sheet>
  </section>
}
