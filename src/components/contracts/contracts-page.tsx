import { useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { TableCell, TableRow } from '@/components/ui/table'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatDate } from '@/lib/date-format'
import { getAdminContract, listAdminContracts, type AdminContract } from '@/services/admin-documents'

const PAGE_SIZE = 25
const contractKey = ['qk-admin-contracts'] as const

function display(value?: string | null) { return value?.trim() || '—' }
function statusClass(status?: string | null) {
  if (['executed', 'signed', 'active', 'completed'].includes(status || '')) return 'bg-success-soft text-success'
  if (['blocked', 'failed', 'expired', 'cancelled'].includes(status || '')) return 'bg-danger-soft text-danger'
  if (['pending', 'awaiting_signature', 'signing'].includes(status || '')) return 'bg-warning-soft text-warning'
  return 'bg-surface-muted text-ink-muted'
}

export function ContractsPage() {
  const { session } = useAuth()
  const [pageIndex, setPageIndex] = useState(0)
  const [organizationId, setOrganizationId] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [pageTokens, setPageTokens] = useState<string[]>([''])
  const pageToken = pageTokens[pageIndex] || ''
  const query = useQuery({
    queryKey: [...contractKey, pageIndex, pageToken, organizationId],
    queryFn: () => listAdminContracts(session!.token, { pageSize: PAGE_SIZE, pageToken: pageToken || undefined, organizationId: organizationId.trim() || undefined }),
    enabled: Boolean(session?.token),
  })
  const contracts = (query.data?.contracts ?? []).filter((item): item is AdminContract => Boolean(item))
  const nextToken = query.data?.nextPageToken || ''
  const pageCount = Math.max(1, pageIndex + (nextToken ? 2 : 1))
  const selected = contracts.find((contract) => contract.id === selectedId) ?? null

  function nextPage() {
    if (!nextToken) return
    setPageTokens((tokens) => [...tokens.slice(0, pageIndex + 1), nextToken])
    setPageIndex((index) => index + 1)
  }
  function previousPage() { setPageIndex((index) => Math.max(0, index - 1)) }
  function updateOrganization(value: string) { setOrganizationId(value); setPageIndex(0); setPageTokens(['']) }

  return <section className="space-y-6">
    <div><h1 className="text-xl font-semibold tracking-tight">Contracts</h1><p className="mt-1 max-w-2xl text-sm text-ink-muted">Review contract status and open the full agreement record.</p></div>
    <div className="flex justify-end"><label className="flex items-center gap-2 text-xs font-medium text-ink-muted">Organization ID<Input value={organizationId} onChange={(event) => updateOrganization(event.target.value)} placeholder="Filter by organization" className="w-56" /></label></div><Card className="gap-0 py-0"><CardContent className="p-0"><DataTable data={contracts} headers={['Contract', 'Relationship', 'Organization', 'Status', 'Created', 'Executed']} label="Contracts" loading={query.isLoading} loadingMessage="Loading contracts…" error={query.isError ? query.error.message : null} emptyMessage={organizationId ? 'No contracts match this organization.' : 'No contracts found.'} pagination={false} renderRow={(contract) => <TableRow key={contract.id || `${contract.operationId}-${contract.createdAt}`} className="cursor-pointer" onClick={() => contract.id && setSelectedId(contract.id)}>
        <TableCell><span className="block font-medium">{display(contract.category || contract.relationship)} agreement</span><span className="mt-0.5 block max-w-56 truncate text-xs text-ink-muted">{display(contract.id)}</span></TableCell>
        <TableCell>{display(contract.relationship)}</TableCell><TableCell>{display(contract.parties?.filter(Boolean).map((party) => party?.organizationId).filter(Boolean).join(', '))}</TableCell>
        <TableCell><Badge className={statusClass(contract.status)}>{display(contract.status)}</Badge></TableCell><TableCell>{formatDate(contract.createdAt?.slice(0, 10))}</TableCell><TableCell>{formatDate(contract.executedAt?.slice(0, 10))}</TableCell>
      </TableRow>} containerClassName="" />
        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4"><p aria-live="polite" className="text-xs text-ink-muted">Showing {contracts.length ? pageIndex * PAGE_SIZE + 1 : 0} to {pageIndex * PAGE_SIZE + contracts.length} contracts{nextToken ? ' · more available' : ''}</p><div className="flex gap-2"><button type="button" className="rounded-lg border border-line px-3 py-1.5 text-xs disabled:opacity-50" onClick={previousPage} disabled={pageIndex === 0}>Previous</button><span className="self-center text-xs text-ink-muted">Page {pageIndex + 1} of {pageCount}</span><button type="button" className="rounded-lg border border-line px-3 py-1.5 text-xs disabled:opacity-50" onClick={nextPage} disabled={!nextToken}>Next</button></div></div>
      </CardContent></Card>
    <ContractDetailsSheet contract={selected} open={Boolean(selectedId)} onOpenChange={(open) => { if (!open) setSelectedId('') }} />
  </section>
}

function ContractDetailsSheet({ contract, open, onOpenChange }: { contract: AdminContract | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { session } = useAuth()
  const contractId = contract?.id || ''
  const query = useQuery({ queryKey: [...contractKey, 'detail', contractId], queryFn: () => getAdminContract(session!.token, contractId), enabled: Boolean(open && session?.token && contractId) })
  const details = query.data ?? contract
  const parties = useMemo(() => (details?.parties ?? []).filter((party) => party != null), [details?.parties])
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className="w-full overflow-y-auto sm:max-w-xl"><SheetHeader><SheetTitle>Contract details</SheetTitle><SheetDescription>{display(details?.id)}</SheetDescription></SheetHeader>
    <div className="space-y-6 px-6 pb-8">{query.isLoading ? <p className="py-8 text-center text-sm text-ink-muted">Loading contract…</p> : query.isError ? <p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">{query.error.message}</p> : details && <>
      <section><h3 className="text-sm font-semibold">Agreement</h3><dl className="mt-3 grid grid-cols-2 gap-4 text-sm"><Detail label="Status">{display(details.status)}</Detail><Detail label="Relationship">{display(details.relationship)}</Detail><Detail label="Category">{display(details.category)}</Detail><Detail label="Country">{display(details.country)}</Detail><Detail label="Profile">{display(details.profileKind)} · {display(details.profileId)}</Detail><Detail label="Template">{display(details.templateId)}{details.templateVersion ? ` · v${details.templateVersion}` : ''}</Detail><Detail label="Revision">{details.currentRevision ?? '—'}</Detail><Detail label="Signing deadline">{formatDate(details.signingDeadline?.slice(0, 10))}</Detail><Detail label="Created">{formatDate(details.createdAt?.slice(0, 10))}</Detail><Detail label="Executed">{formatDate(details.executedAt?.slice(0, 10))}</Detail></dl></section>
      <section><h3 className="text-sm font-semibold">Parties</h3>{parties.length ? <div className="mt-3 space-y-2">{parties.map((party, index) => <div key={party?.id || index} className="rounded-lg border border-line p-3"><p className="text-sm font-medium">{display(party?.legalName)}</p><p className="mt-1 text-xs text-ink-muted">{display(party?.role)} · {display(party?.organizationId)}</p></div>)}</div> : <p className="mt-2 text-sm text-ink-muted">No parties recorded.</p>}</section>
      <section><h3 className="text-sm font-semibold">Revisions</h3>{(details.revisions ?? []).filter(Boolean).length ? <div className="mt-3 space-y-2">{details.revisions!.filter(Boolean).map((revision, index) => <div key={revision?.id || index} className="rounded-lg border border-line p-3"><p className="text-sm font-medium">Revision {revision?.revision ?? index + 1} <span className="font-normal text-ink-muted">· {display(revision?.status)}</span></p><p className="mt-1 text-xs text-ink-muted">{formatDate(revision?.createdAt?.slice(0, 10))} · {revision?.signatures?.filter(Boolean).length ?? 0} signatures</p></div>)}</div> : <p className="mt-2 text-sm text-ink-muted">No revisions recorded.</p>}</section>
    </>}</div>
  </SheetContent></Sheet>
}

function Detail({ label, children }: { label: string; children: ReactNode }) { return <div className="min-w-0"><dt className="text-xs text-ink-muted">{label}</dt><dd className="mt-1 break-words">{children}</dd></div> }

export function ContractDetailsPage() { return <ContractsPage /> }
