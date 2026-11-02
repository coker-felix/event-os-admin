import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth'
import { decideOrganizationCapabilityKYB, getOrganizationKYBEvidence, setOrganizationCapabilityStatus, submitOrganizationCapabilityKYB, uploadOrganizationKYBEvidence, type OrganizationKYBEvidence } from '@/services/admin-organizations'

type CapabilityState = { capability: string; status?: string | null; kybStatus?: string | null }
type Evidence = OrganizationKYBEvidence & { capability: string }

export function OrganizationKYB({ organizationId, capabilities }: { organizationId: string; capabilities: Array<CapabilityState | null> }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const activeCapabilities = useMemo(() => capabilities.filter((item): item is CapabilityState => Boolean(item?.capability)), [capabilities])
  const [capability, setCapability] = useState(activeCapabilities[0]?.capability ?? '')
  const [kind, setKind] = useState('business_registration')
  const [file, setFile] = useState<File | null>(null)
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [reason, setReason] = useState('')
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved')
  const [statusReason, setStatusReason] = useState('')
  const [idempotencyKey, setIdempotencyKey] = useState('')
  const artifactQueries = useQuery({
    queryKey: ['admin-kyb-evidence', organizationId, capability, evidence.filter((item) => item.capability === capability).map((item) => item.artifactId)],
    queryFn: async () => Promise.all(evidence.filter((item) => item.capability === capability).map(async (item) => ({ ...await getOrganizationKYBEvidence(session!.token, organizationId, capability, item.artifactId), artifactId: item.artifactId, capability }))),
    enabled: Boolean(session?.token && capability && evidence.some((item) => item.capability === capability)),
    refetchInterval: (query) => query.state.data?.some((item) => item.scanStatus === 'pending') ? 5000 : false,
  })
  useEffect(() => {
    if (artifactQueries.data) setEvidence((current) => current.map((item) => artifactQueries.data!.find((fresh) => fresh.artifactId === item.artifactId) ?? item))
  }, [artifactQueries.data])

  const upload = useMutation({
    mutationFn: () => uploadOrganizationKYBEvidence(session!.token, organizationId, capability, kind.trim(), file!),
    onSuccess: async (result) => {
      setEvidence((current) => [...current.filter((item) => item.artifactId !== result.artifactId), { ...result, capability }])
      setFile(null)
      await queryClient.invalidateQueries({ queryKey: ['admin-kyb-evidence', organizationId, capability] })
    },
  })
  const submit = useMutation({
    mutationFn: (key: string) => submitOrganizationCapabilityKYB(session!.token, organizationId, capability, evidence.filter((item) => item.capability === capability && item.scanStatus === 'clean').map(({ kind: documentKind, artifactId }) => ({ kind: documentKind, artifactId })), key),
    onSuccess: async () => {
      sessionStorage.removeItem(`admin-kyb-submit:${organizationId}:${capability}`)
      setIdempotencyKey('')
      await queryClient.invalidateQueries({ queryKey: ['admin-organization', organizationId] })
    },
  })
  const review = useMutation({
    mutationFn: () => decideOrganizationCapabilityKYB(session!.token, organizationId, capability, decision, reason.trim()),
    onSuccess: async () => { setReason(''); await queryClient.invalidateQueries({ queryKey: ['admin-organization', organizationId] }) },
  })
  const statusMutation = useMutation({
    mutationFn: (next: 'active' | 'suspended') => setOrganizationCapabilityStatus(session!.token, organizationId, capability, next, statusReason.trim()),
    onSuccess: async () => { setStatusReason(''); await queryClient.invalidateQueries({ queryKey: ['admin-organization', organizationId] }) },
  })
  const selected = activeCapabilities.find((item) => item.capability === capability)
  const selectedEvidence = evidence.filter((item) => item.capability === capability)
  const cleanCount = selectedEvidence.filter((item) => item.scanStatus === 'clean').length
  const submitKYB = () => {
    const key = idempotencyKey || sessionStorage.getItem(`admin-kyb-submit:${organizationId}:${capability}`) || crypto.randomUUID()
    setIdempotencyKey(key)
    sessionStorage.setItem(`admin-kyb-submit:${organizationId}:${capability}`, key)
    submit.mutate(key)
  }

  if (!activeCapabilities.length) return null
  return <Card>
    <CardHeader><CardTitle>Capability KYB</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <label className="block max-w-sm space-y-1.5 text-sm font-medium">Capability
        <select aria-label="KYB capability" value={capability} onChange={(event) => { setCapability(event.target.value); setIdempotencyKey('') }} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm">
          {activeCapabilities.map((item) => <option key={item.capability} value={item.capability}>{item.capability} · {item.kybStatus || 'pending'}</option>)}
        </select>
      </label>
      {selected?.kybStatus !== 'under_review' && selected?.kybStatus !== 'approved' && <div className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="space-y-1.5 text-sm font-medium">Evidence type<Input value={kind} onChange={(event) => setKind(event.target.value)} maxLength={100} /></label>
        <label className="space-y-1.5 text-sm font-medium">Document (PDF, JPEG, PNG; up to 15 MiB)<Input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
        <div className="flex items-end"><Button type="button" disabled={!file || !kind.trim() || upload.isPending} onClick={() => upload.mutate()}>{upload.isPending ? 'Uploading…' : 'Upload evidence'}</Button></div>
        {upload.isError && <p role="alert" className="text-sm text-danger sm:col-span-3">{upload.error.message}</p>}
      </div>}
      {selectedEvidence.length > 0 && <ul className="space-y-2" aria-label="Uploaded KYB evidence">{selectedEvidence.map((item) => <li key={item.artifactId} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-subtle p-3 text-sm"><span>{item.kind}</span><span className={item.scanStatus === 'quarantined' ? 'text-danger' : 'text-ink-muted'}>Scan: {item.scanStatus}</span></li>)}</ul>}
      {artifactQueries.isError && <p role="alert" className="text-sm text-danger">Evidence status could not be refreshed. Try again before submitting.</p>}
      {selected?.kybStatus !== 'under_review' && selected?.kybStatus !== 'approved' && <div className="flex flex-wrap items-end gap-3 border-t border-line pt-4">
        <Button type="button" disabled={cleanCount === 0 || submit.isPending || artifactQueries.isError} onClick={submitKYB}>{submit.isPending ? 'Submitting…' : `Submit ${cleanCount} clean document${cleanCount === 1 ? '' : 's'}`}</Button>
        <p className="text-xs text-ink-muted">Evidence can be submitted after the trusted scan reports clean.</p>
      </div>}
      {submit.isError && <p role="alert" className="text-sm text-danger">{submit.error.message} Retry reuses the same submission key.</p>}
      {submit.isSuccess && <p role="status" className="text-sm text-ink-muted">KYB submitted for review.</p>}
      {(selected?.kybStatus === 'under_review' || selected?.kybStatus === 'rejected') && <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_1fr_auto]">
        <label className="space-y-1.5 text-sm font-medium">Decision<select aria-label="KYB decision" value={decision} onChange={(event) => setDecision(event.target.value as 'approved' | 'rejected')} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"><option value="approved">Approve</option><option value="rejected">Reject</option></select></label>
        <label className="space-y-1.5 text-sm font-medium">Reason<Input value={reason} onChange={(event) => setReason(event.target.value)} required /></label>
        <div className="flex items-end"><Button type="button" disabled={!reason.trim() || review.isPending} onClick={() => review.mutate()}>{review.isPending ? 'Saving…' : 'Record decision'}</Button></div>
        {review.isError && <p role="alert" className="text-sm text-danger sm:col-span-3">{review.error.message}</p>}
      </div>}
      {selected && (selected.kybStatus === 'approved' && selected.status !== 'active' || selected.status === 'active') && <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_auto]">
        <label className="space-y-1.5 text-sm font-medium">{selected.status === 'active' ? 'Suspension reason' : 'Activation reason'}<Input value={statusReason} onChange={(event) => setStatusReason(event.target.value)} required /></label>
        <div className="flex items-end"><Button type="button" disabled={!statusReason.trim() || statusMutation.isPending} onClick={() => { const next = selected.status === 'active' ? 'suspended' : 'active'; if (window.confirm(`${next === 'suspended' ? 'Suspend' : 'Activate'} the ${capability} capability?`)) statusMutation.mutate(next) }}>{statusMutation.isPending ? 'Saving…' : selected.status === 'active' ? 'Suspend capability' : 'Activate capability'}</Button></div>
        {statusMutation.isError && <p role="alert" className="text-sm text-danger sm:col-span-2">{statusMutation.error.message}</p>}
      </div>}
    </CardContent>
  </Card>
}
