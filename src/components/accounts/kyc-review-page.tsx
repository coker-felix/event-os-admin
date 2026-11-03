import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FilterTabs } from '@/components/ui/filter-tabs'
import { Input } from '@/components/ui/input'
import { TableCell, TableRow } from '@/components/ui/table'
import { decideAdminKycProfile, getAdminKycProfile, listAdminKycProfiles, type AdminKycProfile } from '@/services/admin-kyc'
import { listAdminConsumers } from '@/services/admin-users'
import { listAdminOrganizations, listAdminVendors, listAllAdminVenueDirectory } from '@/services/admin-account-directory'

const kycKey = ['qk-admin-kyc-profiles'] as const
const statuses = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'changes_requested', label: 'Changes requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

function statusLabel(status?: string | null) {
  return (status || 'unknown').replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function dateLabel(value?: string | null) {
  if (!value) return 'Not provided'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date)
}

function safeDocumentUrl(value?: string | null) {
  if (!value) return null
  try {
    const url = new URL(value, window.location.origin)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

export function AccountsKycReviewPage() {
  const { session } = useAuth()
  const client = useQueryClient()
  const [status, setStatus] = useState('pending')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<AdminKycProfile | null>(null)
  const [decision, setDecision] = useState<'approved' | 'rejected' | 'changes_requested' | null>(null)
  const [note, setNote] = useState('')
  const query = useQuery({ queryKey: kycKey, queryFn: () => listAdminKycProfiles(session!.token), enabled: Boolean(session?.token) })
  const accountsQuery = useQuery({ queryKey: ['qk-admin-kyc-account-names'], queryFn: () => listAdminConsumers(session!.token), enabled: Boolean(session?.token) })
  const organizationsQuery = useQuery({ queryKey: ['qk-admin-kyc-organization-names'], queryFn: () => listAdminOrganizations(session!.token), enabled: Boolean(session?.token) })
  const vendorsQuery = useQuery({ queryKey: ['qk-admin-kyc-vendor-names'], queryFn: () => listAdminVendors(session!.token), enabled: Boolean(session?.token) })
  const venuesQuery = useQuery({ queryKey: ['qk-admin-kyc-venue-names'], queryFn: () => listAllAdminVenueDirectory(session!.token), enabled: Boolean(session?.token) })
  const detail = useQuery({ queryKey: [...kycKey, 'detail', selected?.id], queryFn: () => getAdminKycProfile(session!.token, selected!.id), enabled: Boolean(session?.token && selected?.id) })
  const accountNames = useMemo(() => new Map((accountsQuery.data?.users ?? []).map((account) => [account.id, account.name?.trim() || account.email?.trim() || 'Unnamed account'])), [accountsQuery.data?.users])
  const profileNames = useMemo(() => {
    const names = new Map<string, string>()
    for (const profile of query.data?.profiles ?? []) {
      const accountId = profile.accountId
      if (!accountId) continue
      const type = (profile.type || '').toLowerCase()
      const vendor = (vendorsQuery.data?.vendors ?? []).find((item) => item.accountId === accountId)
      const organization = (organizationsQuery.data?.organizations ?? []).find((item) => item.id === accountId || item.ownerId === accountId)
      const venue = (venuesQuery.data?.venues ?? []).find((item) => item.id === accountId || item.ownerAccountId === accountId || item.createdByAccountId === accountId)
      const name = type === 'vendor' ? vendor?.businessName
        : type === 'venue' ? venue?.name
          : type === 'organizer' || type === 'organization' ? organization?.name
            : undefined
      if (name?.trim()) names.set(profile.id, name.trim())
    }
    return names
  }, [organizationsQuery.data?.organizations, query.data?.profiles, vendorsQuery.data?.vendors, venuesQuery.data?.venues])
  const rows = useMemo(() => (query.data?.profiles ?? []).filter((profile) => {
    const matchesStatus = !status || profile.status === status
    const term = search.trim().toLowerCase()
    const accountName = profile.accountId ? accountNames.get(profile.accountId) : undefined
    const profileName = profileNames.get(profile.id)
    return matchesStatus && (!term || [profileName, accountName, profile.id, profile.accountId, profile.type].some((value) => value?.toLowerCase().includes(term)))
  }), [accountNames, profileNames, query.data?.profiles, search, status])
  const review = useMutation({
    mutationFn: () => decideAdminKycProfile(session!.token, selected!.id, decision!, note.trim()),
    onSuccess: async () => {
      toast.success(`KYC profile ${statusLabel(decision).toLowerCase()}.`)
      setDecision(null); setNote(''); setSelected(null)
      await client.invalidateQueries({ queryKey: kycKey })
    },
    onError: (error: Error) => toast.error(error.message),
  })
  const canReview = selected?.status === 'pending' || selected?.status === 'changes_requested'
  const beginDecision = (value: 'approved' | 'rejected' | 'changes_requested') => { setDecision(value); setNote('') }

  return <section className="space-y-5">
    <header><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Accounts</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">KYC review</h1><p className="mt-2 max-w-2xl text-sm text-ink-muted">Review submitted identity profiles and record an approval, rejection, or request for changes.</p></header>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <FilterTabs label="Filter KYC profiles by status" value={status} onValueChange={setStatus} options={statuses} />
      <Input aria-label="Search KYC profiles" placeholder="Search account, profile or type" value={search} onChange={(event) => setSearch(event.target.value)} className="sm:max-w-xs" />
    </div>
    <Card className="gap-0 py-0"><CardContent className="p-0"><DataTable data={rows} headers={['Profile', 'Account', 'Type', 'Status', 'Submitted', 'Documents']} label="KYC profiles" loading={query.isLoading} loadingMessage="Loading KYC profiles…" error={query.isError ? query.error.message : null} emptyMessage={search ? 'No profiles match your search.' : status ? `No ${statusLabel(status).toLowerCase()} profiles.` : 'No KYC profiles found.'} renderRow={(profile) => <TableRow key={profile.id} tabIndex={0} className="cursor-pointer" onClick={() => setSelected(profile)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(profile) } }}>
      <TableCell><span className="block font-medium">{profileNames.get(profile.id) || `${statusLabel(profile.type)} profile`}</span><span className="mt-0.5 block break-all font-mono text-[11px] text-ink-muted">{profile.id}</span></TableCell><TableCell><span className="block font-medium">{profile.accountId ? accountNames.get(profile.accountId) || 'Account name unavailable' : '—'}</span>{profile.accountId && <span className="mt-0.5 block break-all font-mono text-[11px] text-ink-muted">{profile.accountId}</span>}</TableCell><TableCell>{statusLabel(profile.type)}</TableCell><TableCell><Badge variant="outline">{statusLabel(profile.status)}</Badge></TableCell><TableCell>{dateLabel(profile.submittedAt)}</TableCell><TableCell>{profile.documentCount ?? 0}</TableCell>
    </TableRow>} containerClassName="" /></CardContent></Card>
    <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) { setSelected(null); setDecision(null) } }}>
      <DialogContent className="max-h-[min(88vh,800px)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>KYC profile review</DialogTitle><DialogDescription>Inspect the submitted documents and record a review decision.</DialogDescription></DialogHeader>
        {detail.isLoading ? <p className="py-6 text-sm text-ink-muted">Loading profile and documents…</p> : detail.isError ? <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{detail.error.message}</p> : detail.data ? <div className="space-y-5">
          <dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-xs text-ink-muted">Profile</dt><dd className="mt-1">{profileNames.get(selected?.id || '') || `${statusLabel(detail.data.profile?.type || selected?.type)} profile`}<span className="mt-1 block break-all font-mono text-xs text-ink-muted">{detail.data.profile?.id || selected?.id}</span></dd></div><div><dt className="text-xs text-ink-muted">Account</dt><dd className="mt-1">{accountNames.get(detail.data.profile?.accountId || selected?.accountId || '') || 'Account name unavailable'}<span className="mt-1 block break-all font-mono text-xs text-ink-muted">{detail.data.profile?.accountId || selected?.accountId || 'Not provided'}</span></dd></div><div><dt className="text-xs text-ink-muted">Type</dt><dd className="mt-1">{statusLabel(detail.data.profile?.type || selected?.type)}</dd></div><div><dt className="text-xs text-ink-muted">Status</dt><dd className="mt-1">{statusLabel(detail.data.profile?.status || selected?.status)}</dd></div></dl>
          <div><h3 className="text-sm font-semibold">Documents</h3>{detail.data.documents.length ? <ul className="mt-2 divide-y divide-line rounded-xl border border-line">{detail.data.documents.map((document, index) => { const href = safeDocumentUrl(document.refUrl); return <li key={document.id || `${document.kind}-${index}`} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3"><div><p className="font-medium">{document.kind || 'Identity document'}</p><p className="mt-0.5 break-all text-xs text-ink-muted">{document.refUrl || 'Document reference unavailable'}</p></div>{href ? <a href={href} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand underline">Open document</a> : <span className="text-xs text-ink-muted">Link unavailable</span>}</li> })}</ul> : <p className="mt-2 rounded-xl bg-surface-muted px-3 py-4 text-sm text-ink-muted">No documents were submitted.</p>}</div>
        </div> : null}
        {canReview && !decision && <DialogFooter className="flex-wrap sm:justify-start"><Button onClick={() => beginDecision('approved')}>Approve</Button><Button variant="outline" onClick={() => beginDecision('changes_requested')}>Request changes</Button><Button variant="destructive" onClick={() => beginDecision('rejected')}>Reject</Button></DialogFooter>}
        {decision && <div className="space-y-3 border-t border-line pt-4"><label className="block text-sm font-medium" htmlFor="kyc-review-note">Review note</label><textarea id="kyc-review-note" value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/30" placeholder="Explain the decision for the applicant" /><DialogFooter><Button variant="outline" onClick={() => setDecision(null)} disabled={review.isPending}>Back</Button><Button onClick={() => review.mutate()} disabled={review.isPending || !note.trim()}>{review.isPending ? 'Saving…' : `Confirm ${statusLabel(decision).toLowerCase()}`}</Button></DialogFooter></div>}
        {!canReview && selected && <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-ink-muted">This profile is already {statusLabel(selected.status).toLowerCase()} and cannot be changed.</p>}
      </DialogContent>
    </Dialog>
  </section>
}
