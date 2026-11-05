import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/auth'
import { setOrganizationCapabilityStatus } from '@/services/admin-organizations'

type CapabilityState = {
  capability: string
  status?: string | null
  kybStatus?: string | null
}

type StatusChange = {
  capability: string
  status: 'active' | 'suspended'
  reason: string
}

export function OrganizationCapabilities({
  organizationId,
  capabilities,
}: {
  organizationId: string
  capabilities: Array<CapabilityState | null>
}) {
  const { session } = useAuth()
  const client = useQueryClient()
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const entries = capabilities.filter((item): item is CapabilityState => Boolean(item?.capability))

  const statusMutation = useMutation({
    mutationFn: ({ capability, status, reason }: StatusChange) =>
      setOrganizationCapabilityStatus(session!.token, organizationId, capability, status, reason),
    onSuccess: async (_result, change) => {
      setReasons((current) => ({ ...current, [change.capability]: '' }))
      await Promise.all([
        client.invalidateQueries({ queryKey: ['admin-organization', organizationId] }),
        client.invalidateQueries({ queryKey: ['qk-admin-organizations'] }),
      ])
    },
  })

  const changeStatus = (event: FormEvent<HTMLFormElement>, item: CapabilityState) => {
    event.preventDefault()
    const status = item.status === 'active' ? 'suspended' : 'active'
    const reason = (reasons[item.capability] ?? '').trim()
    if (!reason) return
    if (status === 'suspended' && !window.confirm(`Suspend the ${item.capability} capability?`)) return
    statusMutation.mutate({ capability: item.capability, status, reason })
  }

  return (
    <div className="space-y-3">
      {entries.map((item) => {
        const status = item.status || 'pending'
        const canSuspend = status === 'active'
        const canActivate = status !== 'active' && status !== 'revoked' && item.kybStatus === 'approved'
        const error = statusMutation.isError && statusMutation.variables?.capability === item.capability

        return (
          <section key={item.capability} className="rounded-lg border border-line p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-medium capitalize">{item.capability}</h3>
                <p className="mt-1 text-sm text-ink-muted">
                  Capability: {status.replaceAll('_', ' ')} <span aria-hidden="true">·</span> KYB: {item.kybStatus || 'pending'}
                </p>
              </div>
              <Badge variant={status === 'active' ? 'default' : 'outline'}>{status.replaceAll('_', ' ')}</Badge>
            </div>

            {(canActivate || canSuspend) && (
              <form className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" onSubmit={(event) => changeStatus(event, item)}>
                <label className="space-y-1.5 text-sm font-medium">
                  {canSuspend ? 'Suspension reason' : 'Activation reason'}
                  <Input
                    value={reasons[item.capability] ?? ''}
                    onChange={(event) => setReasons((current) => ({ ...current, [item.capability]: event.target.value }))}
                    required
                    maxLength={500}
                    aria-label={`${canSuspend ? 'Suspension' : 'Activation'} reason for ${item.capability}`}
                  />
                </label>
                <Button
                  type="submit"
                  variant={canSuspend ? 'destructive' : 'default'}
                  disabled={!reasons[item.capability]?.trim() || statusMutation.isPending}
                >
                  {statusMutation.isPending && statusMutation.variables?.capability === item.capability
                    ? 'Saving…'
                    : canSuspend
                      ? 'Suspend capability'
                      : 'Activate capability'}
                </Button>
                {error && <p role="alert" className="text-sm text-danger sm:col-span-2">{statusMutation.error.message}</p>}
              </form>
            )}

            {!canActivate && !canSuspend && status !== 'revoked' && item.kybStatus !== 'approved' && (
              <p className="mt-3 text-sm text-ink-muted">Approve this capability’s KYB in the Verification tab before activation.</p>
            )}
            {status === 'revoked' && <p className="mt-3 text-sm text-ink-muted">This capability has been revoked and cannot be reactivated.</p>}
          </section>
        )
      })}
      {entries.length === 0 && <p className="text-sm text-ink-muted">No capabilities have been assigned to this organization.</p>}
    </div>
  )
}
