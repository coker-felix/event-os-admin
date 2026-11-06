import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useParams } from '@tanstack/react-router'
import { getVenueSpecs, verifyVenueSpec, type VenueSpec } from '@/services/admin-planning'
import { formatDate } from '@/lib/date-format'

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

export function VenueSpecsPage() {
  const { venueId } = useParams({ strict: false }) as { venueId: string }
  const { session } = useAuth()
  const client = useQueryClient()
  const [error, setError] = useState('')
  const queryKey = ['planning-venue-specs', venueId]
  const query = useQuery({ queryKey, queryFn: () => getVenueSpecs(session!.token, venueId), enabled: Boolean(session?.token && venueId) })
  const verify = useMutation({
    mutationFn: (fieldCode: string) => verifyVenueSpec(session!.token, venueId, fieldCode),
    onSuccess: (updated) => { setError(''); client.setQueryData<VenueSpec>(queryKey, (current) => current ? { ...current, fields: current.fields.map((field) => field.code === updated.code ? { ...field, ...updated } : field) } : current) },
    onError: (cause: Error) => setError(cause.message),
  })
  const status = (query.error as (Error & { status?: number }) | null)?.status
  return <section className="space-y-6"><header><h1 className="text-xl font-semibold">Venue technical specifications</h1><p className="mt-1 text-sm text-ink-muted">Review declared values and verify venue information.</p></header>
    {query.isLoading ? <p role="status">Loading venue specifications…</p> : query.isError ? <p role="alert">{status === 412 ? 'Event planning is not enabled for this organization.' : query.error.message}</p> : (query.data?.fields ?? []).length === 0 ? <p>No technical specifications have been declared.</p> : <Card className="gap-0 py-0"><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full"><thead><tr><th>Field</th><th>Value</th><th>Source</th><th>Updated</th><th>Action</th></tr></thead><tbody>{(query.data?.fields ?? []).map((field) => <tr key={field.code}><td>{field.label}</td><td>{displayValue(field.value)}</td><td>{field.source}</td><td>{field.updatedAt ? formatDate(new Date(field.updatedAt * 1000).toISOString().slice(0, 10)) : '—'}{field.stale ? <span className="ml-2 rounded-full bg-warning/10 px-2 py-1 text-xs text-warning">Stale</span> : null}</td><td>{field.source === 'declared' && field.known ? <Button variant="outline" disabled={verify.isPending} onClick={() => verify.mutate(field.code)}>Mark verified for {field.label}</Button> : '—'}</td></tr>)}</tbody></table></div></CardContent></Card>}
    {error && <p role="alert">{error}</p>}
  </section>
}
