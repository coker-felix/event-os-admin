import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth'
import {
  decideOrganizationCapabilityKYB,
  getOrganizationKYBEvidence,
  getOrganizationKYBRequirements,
  setOrganizationCapabilityStatus,
  submitOrganizationCapabilityKYB,
  uploadOrganizationKYBEvidence,
  type OrganizationKYBEvidence,
  type OrganizationKYBRequirement,
  type OrganizationKYBSubmissionField,
} from '@/services/admin-organizations'

type CapabilityState = { capability: string; status?: string | null; kybStatus?: string | null }
type Evidence = OrganizationKYBEvidence & { capability: string }
type SubmissionInput = { documents: Array<{ kind: string; artifactId: string }>; fields: Array<{ key: string; textValue?: string; artifactId?: string }> }

export function OrganizationKYB({ organizationId, capabilities }: { organizationId: string; capabilities: Array<CapabilityState | null> }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const activeCapabilities = useMemo(() => capabilities.filter((item): item is CapabilityState => Boolean(item?.capability)), [capabilities])
  const [capability, setCapability] = useState(activeCapabilities[0]?.capability ?? '')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({})
  const [localEvidence, setLocalEvidence] = useState<Evidence[]>([])
  const [reason, setReason] = useState('')
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved')
  const [statusReason, setStatusReason] = useState('')
  const [idempotencyKey, setIdempotencyKey] = useState('')
  const requirementQuery = useQuery({
    queryKey: ['admin-kyb-requirements', organizationId, capability],
    queryFn: () => getOrganizationKYBRequirements(session!.token, organizationId, capability),
    enabled: Boolean(session?.token && capability),
  })
  const requirementSet = requirementQuery.data
  const requirements = useMemo(() => (requirementSet?.requirements ?? []).filter((item): item is OrganizationKYBRequirement => Boolean(item?.enabled)), [requirementSet?.requirements])
  const submittedFields = useMemo(() => (requirementSet?.submittedFields ?? []).filter((item): item is OrganizationKYBSubmissionField => Boolean(item?.key)), [requirementSet?.submittedFields])
  const trackedArtifacts = useMemo(() => {
    const artifacts = new Map<string, { kind: string; artifactId: string }>()
    for (const field of submittedFields) if (field.inputType === 'file' && field.artifactId) artifacts.set(field.artifactId, { kind: field.key, artifactId: field.artifactId })
    for (const item of localEvidence) if (item.capability === capability) artifacts.set(item.artifactId, { kind: item.kind, artifactId: item.artifactId })
    return [...artifacts.values()]
  }, [submittedFields, localEvidence, capability])
  const artifactIds = trackedArtifacts.map((item) => item.artifactId)
  const savedEvidenceQuery = useQuery({
    queryKey: ['admin-kyb-evidence', organizationId, capability, artifactIds],
    queryFn: async () => Promise.all(trackedArtifacts.map(async (field) => ({
      ...await getOrganizationKYBEvidence(session!.token, organizationId, capability, field.artifactId),
      artifactId: field.artifactId,
      capability,
    }))),
    enabled: Boolean(session?.token && artifactIds.length),
    refetchInterval: (query) => query.state.data?.some((item) => item.scanStatus === 'pending') ? 5000 : false,
  })
  const savedEvidence = savedEvidenceQuery.data ?? []
  const evidenceByKey = new Map<string, Evidence>()
  for (const item of localEvidence.filter((entry) => entry.capability === capability)) evidenceByKey.set(item.kind, item)
  for (const item of savedEvidence) evidenceByKey.set(item.kind, item)
  const selected = activeCapabilities.find((item) => item.capability === capability)
  const cleanCount = [...evidenceByKey.values()].filter((item) => item.scanStatus === 'clean').length

  useEffect(() => {
    if (!requirementSet) return
    setFieldValues((current) => {
      const next = { ...current }
      for (const field of submittedFields) {
        if (field.inputType === 'text' && next[`${capability}:${field.key}`] === undefined) {
          next[`${capability}:${field.key}`] = field.textValue ?? ''
        }
      }
      return next
    })
  }, [requirementSet, capability, submittedFields])

  const upload = useMutation({
    mutationFn: ({ requirement, file }: { requirement: OrganizationKYBRequirement; file: File }) => uploadOrganizationKYBEvidence(session!.token, organizationId, capability, requirement.key, file),
    onSuccess: (result) => {
      setLocalEvidence((current) => [...current.filter((item) => item.kind !== result.kind || item.capability !== capability), { ...result, capability }])
      setSelectedFiles((current) => ({ ...current, [result.kind]: null }))
    },
  })
  const submit = useMutation({
    mutationFn: ({ idempotencyKey: key, ...input }: SubmissionInput & { idempotencyKey: string }) => submitOrganizationCapabilityKYB(session!.token, organizationId, capability, input.documents, key, input.fields),
    onSuccess: async () => {
      sessionStorage.removeItem(`admin-kyb-submit:${organizationId}:${capability}`)
      setIdempotencyKey('')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-organization', organizationId] }),
        queryClient.invalidateQueries({ queryKey: ['admin-kyb-requirements', organizationId, capability] }),
      ])
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

  const makeSubmission = (): SubmissionInput => {
    const documents: SubmissionInput['documents'] = []
    const fields: SubmissionInput['fields'] = []
    for (const requirement of requirements) {
      if (requirement.inputType === 'text') {
        const textValue = (fieldValues[`${capability}:${requirement.key}`] ?? '').trim()
        if (textValue) fields.push({ key: requirement.key, textValue })
      } else {
        const evidence = evidenceByKey.get(requirement.key)
        if (evidence?.scanStatus === 'clean') {
          documents.push({ kind: requirement.key, artifactId: evidence.artifactId })
          fields.push({ key: requirement.key, artifactId: evidence.artifactId })
        }
      }
    }
    return { documents, fields }
  }
  const submission = makeSubmission()
  const missingRequired = requirements.some((requirement) => {
    if (!requirement.required) return false
    if (requirement.inputType === 'text') return !(fieldValues[`${capability}:${requirement.key}`] ?? '').trim()
    return evidenceByKey.get(requirement.key)?.scanStatus !== 'clean'
  })
  const submitKYB = () => {
    const key = idempotencyKey || sessionStorage.getItem(`admin-kyb-submit:${organizationId}:${capability}`) || crypto.randomUUID()
    setIdempotencyKey(key)
    sessionStorage.setItem(`admin-kyb-submit:${organizationId}:${capability}`, key)
    submit.mutate({ ...submission, idempotencyKey: key })
  }

  if (!activeCapabilities.length) return null
  return (
    <Card>
      <CardHeader><CardTitle>Capability KYB</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <label className="block max-w-sm space-y-1.5 text-sm font-medium">
          Capability
          <select aria-label="KYB capability" value={capability} onChange={(event) => { setCapability(event.target.value); setIdempotencyKey('') }} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm">
            {activeCapabilities.map((item) => <option key={item.capability} value={item.capability}>{item.capability} · {item.kybStatus || 'pending'}</option>)}
          </select>
        </label>

        {requirementQuery.isLoading ? (
          <p className="py-4 text-sm text-ink-muted">Loading requirements for {requirementSet?.countryCode || 'this country'}…</p>
        ) : requirementQuery.isError ? (
          <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">Requirements could not be loaded: {requirementQuery.error.message}</p>
        ) : requirements.length === 0 ? (
          <div className="rounded-lg border border-line p-4 text-sm">
            <p className="font-medium">No KYB requirements are configured for {requirementSet?.countryCode || 'this country'} · {capability}.</p>
            <p className="mt-1 text-ink-muted">Add requirements in Platform → KYB requirements before collecting a submission.</p>
          </div>
        ) : (
          <>
            {selected?.kybStatus !== 'under_review' && selected?.kybStatus !== 'approved' && (
              <div className="space-y-3">
                {requirements.map((requirement) => {
                  const savedField = submittedFields.find((field) => field.key === requirement.key)
                  const evidence = evidenceByKey.get(requirement.key)
                  const file = selectedFiles[requirement.key]
                  const valueKey = `${capability}:${requirement.key}`
                  return requirement.inputType === 'text' ? (
                    <label key={requirement.key} className="block max-w-xl space-y-1.5 text-sm font-medium">
                      {requirement.label}{requirement.required ? ' · Required' : ' · Optional'}
                      <Input value={fieldValues[valueKey] ?? savedField?.textValue ?? ''} maxLength={500} onChange={(event) => setFieldValues((current) => ({ ...current, [valueKey]: event.target.value }))} />
                    </label>
                  ) : (
                    <div key={requirement.key} className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-[1fr_auto] sm:items-end">
                      <label className="space-y-1.5 text-sm font-medium">
                        {requirement.label}{requirement.required ? ' · Required' : ' · Optional'}
                        <Input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setSelectedFiles((current) => ({ ...current, [requirement.key]: event.target.files?.[0] ?? null }))} />
                        <span className="block text-xs font-normal text-ink-muted">PDF, JPEG, or PNG · up to 15 MiB</span>
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        {evidence && <span className={evidence.scanStatus === 'quarantined' ? 'text-sm text-danger' : 'text-sm text-ink-muted'}>Scan: {evidence.scanStatus}</span>}
                        <Button type="button" variant="outline" disabled={!file || upload.isPending} onClick={() => file && upload.mutate({ requirement, file })}>{upload.isPending ? 'Uploading…' : 'Upload file'}</Button>
                      </div>
                    </div>
                  )
                })}
                {upload.isError && <p role="alert" className="text-sm text-danger">{upload.error.message}</p>}
              </div>
            )}

            {(selected?.kybStatus === 'under_review' || selected?.kybStatus === 'approved' || selected?.kybStatus === 'rejected') && submittedFields.length > 0 && (
              <section className="space-y-2 rounded-lg border border-line p-4" aria-label="Submitted KYB requirements">
                <h3 className="text-sm font-semibold">Latest submission · {requirementSet?.countryCode}</h3>
                {submittedFields.map((field) => {
                  const evidence = evidenceByKey.get(field.key)
                  return <div key={field.key} className="flex flex-wrap items-start justify-between gap-2 border-t border-line pt-2 text-sm">
                    <span className="font-medium">{field.label}</span>
                    {field.inputType === 'text' ? <span className="break-all text-ink-muted">{field.textValue || 'Not provided'}</span> : <span className="text-ink-muted">File · {evidence?.scanStatus || 'status unavailable'}</span>}
                  </div>
                })}
              </section>
            )}

            {savedEvidenceQuery.isError && <p role="alert" className="text-sm text-danger">File scan status could not be refreshed. Try again before submitting.</p>}
            {selected?.kybStatus !== 'under_review' && selected?.kybStatus !== 'approved' && (
              <div className="flex flex-wrap items-end gap-3 border-t border-line pt-4">
                <Button type="button" disabled={missingRequired || submission.fields.length === 0 || submit.isPending || savedEvidenceQuery.isError || requirements.some((requirement) => requirement.inputType === 'file' && evidenceByKey.get(requirement.key)?.scanStatus === 'pending')} onClick={submitKYB}>{submit.isPending ? 'Submitting…' : `Submit ${cleanCount} clean file${cleanCount === 1 ? '' : 's'} and text values`}</Button>
                <p className="text-xs text-ink-muted">Required values must be complete and all submitted files must pass the trusted scan.</p>
              </div>
            )}
            {submit.isError && <p role="alert" className="text-sm text-danger">{submit.error.message} Retry reuses the same submission key.</p>}
            {submit.isSuccess && <p role="status" className="text-sm text-ink-muted">KYB submitted for review.</p>}

            {(selected?.kybStatus === 'under_review' || selected?.kybStatus === 'rejected') && (
              <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_1fr_auto]">
                <label className="space-y-1.5 text-sm font-medium">Decision<select aria-label="KYB decision" value={decision} onChange={(event) => setDecision(event.target.value as 'approved' | 'rejected')} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"><option value="approved">Approve</option><option value="rejected">Reject</option></select></label>
                <label className="space-y-1.5 text-sm font-medium">Reason<Input value={reason} onChange={(event) => setReason(event.target.value)} required /></label>
                <div className="flex items-end"><Button type="button" disabled={!reason.trim() || review.isPending} onClick={() => review.mutate()}>{review.isPending ? 'Saving…' : 'Record decision'}</Button></div>
                {review.isError && <p role="alert" className="text-sm text-danger sm:col-span-3">{review.error.message}</p>}
              </div>
            )}
            {selected && (selected.kybStatus === 'approved' && selected.status !== 'active' || selected.status === 'active') && (
              <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_auto]">
                <label className="space-y-1.5 text-sm font-medium">{selected.status === 'active' ? 'Suspension reason' : 'Activation reason'}<Input value={statusReason} onChange={(event) => setStatusReason(event.target.value)} required /></label>
                <div className="flex items-end"><Button type="button" disabled={!statusReason.trim() || statusMutation.isPending} onClick={() => { const next = selected.status === 'active' ? 'suspended' : 'active'; if (window.confirm(`${next === 'suspended' ? 'Suspend' : 'Activate'} the ${capability} capability?`)) statusMutation.mutate(next) }}>{statusMutation.isPending ? 'Saving…' : selected.status === 'active' ? 'Suspend capability' : 'Activate capability'}</Button></div>
                {statusMutation.isError && <p role="alert" className="text-sm text-danger sm:col-span-2">{statusMutation.error.message}</p>}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
