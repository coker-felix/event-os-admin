import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { TableCell, TableRow } from '@/components/ui/table'
import { createSeatChartTemplate, getSeatChartTemplates } from '@/services/admin-seat-charts'
import { PageShell } from '../shared/PageShell'
import { PlanningError } from '../shared/PlanningState'

export function SeatChartTemplatesPage() {
  const { session } = useAuth()
  const client = useQueryClient()
  const [versionId, setVersionId] = useState('')
  const [title, setTitle] = useState('')
  const query = useQuery({ queryKey: ['seat-chart-templates'], queryFn: () => getSeatChartTemplates(session!.token), enabled: Boolean(session?.token) })
  const create = useMutation({
    mutationFn: () => createSeatChartTemplate(session!.token, versionId.trim(), title.trim()),
    onSuccess: () => {
      setVersionId('')
      setTitle('')
      void client.invalidateQueries({ queryKey: ['seat-chart-templates'] })
    },
  })
  return (
    <PageShell title="Seat chart templates" description="Promote a published chart version to a reusable platform template.">
      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_1fr_auto]">
          <label className="grid gap-2 text-sm font-medium">Published version ID<Input value={versionId} onChange={(event) => setVersionId(event.target.value)} placeholder="Version UUID" /></label>
          <label className="grid gap-2 text-sm font-medium">Template name<Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Main auditorium" /></label>
          <div className="flex items-end"><Button disabled={!versionId.trim() || !title.trim() || create.isPending} onClick={() => create.mutate()}>{create.isPending ? 'Creating…' : 'Create template'}</Button></div>
          {create.error && <p role="alert" className="text-sm text-destructive md:col-span-3">{create.error.message}</p>}
        </CardContent>
      </Card>
      {query.isError ? <PlanningError error={query.error} /> : <Card className="gap-0 py-0"><CardContent className="p-0"><DataTable data={query.data?.templates ?? []} label="Seat chart templates" headers={['Template', 'Version', 'Checksum', 'Created']} loading={query.isLoading} loadingMessage="Loading seat chart templates…" emptyMessage="No platform templates yet." containerClassName="" renderRow={(item) => <TableRow key={item.id}><TableCell className="font-medium">{item.title}</TableCell><TableCell className="font-mono text-xs">{item.versionId}</TableCell><TableCell className="font-mono text-xs">{item.checksum.slice(0, 12)}</TableCell><TableCell>{item.createdAt ? new Date(item.createdAt * 1000).toLocaleDateString() : '—'}</TableCell></TableRow>} /></CardContent></Card>}
    </PageShell>
  )
}
