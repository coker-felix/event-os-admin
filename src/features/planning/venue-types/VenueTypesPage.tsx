import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { TableCell, TableRow } from '@/components/ui/table'
import { getVenueTypes, saveVenueType, type VenueType } from '@/services/admin-planning'
import { PageShell } from '../shared/PageShell'
import { PlanningError } from '../shared/PlanningState'

export function VenueTypesPage() {
  const { session } = useAuth()
  const client = useQueryClient()
  const query = useQuery({
    queryKey: ['planning-types'],
    queryFn: () => getVenueTypes(session!.token),
    enabled: Boolean(session?.token),
  })
  const [editing, setEditing] = useState<VenueType | null>(null)
  const [label, setLabel] = useState('')
  const save = useMutation({
    mutationFn: () => saveVenueType(session!.token, editing!.code, label.trim()),
    onSuccess: (saved) => {
      setEditing(null)
      setLabel('')
      client.setQueryData<{ types?: VenueType[] | null }>(['planning-types'], (current) => {
        const types = current?.types ?? []
        return { ...current, types: [...types.filter((type) => type.code !== saved.code), saved] }
      })
      void client.invalidateQueries({ queryKey: ['planning-types'] })
    },
  })
  const beginEdit = (type: VenueType) => {
    setEditing(type)
    setLabel(type.label)
    save.reset()
  }
  return (
    <PageShell title="Venue types" description="Edit labels for venue types.">
      {query.isError ? (
        <PlanningError error={query.error} />
      ) : (
        <Card className="gap-0 py-0">
          <CardContent className="p-0">
            <DataTable
              data={query.data?.types ?? []}
              label="Venue types"
              headers={['Code', 'Label', 'Actions']}
              loading={query.isLoading}
              loadingMessage="Loading venue types…"
              emptyMessage="No venue types configured."
              containerClassName=""
              renderRow={(type) => (
                <TableRow key={type.code}>
                  <TableCell>{type.code}</TableCell>
                  <TableCell>{type.label}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      aria-label={`Edit label for ${type.label}`}
                      onClick={() => beginEdit(type)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            />
          </CardContent>
        </Card>
      )}
      {editing && (
        <form
          className="space-y-3 rounded-lg border border-line p-4"
          onSubmit={(event) => {
            event.preventDefault()
            save.mutate()
          }}
        >
          <h2 className="font-semibold">Edit {editing.label}</h2>
          <label className="block">
            Type code
            <Input aria-label="Type code" value={editing.code} readOnly />
          </label>
          <label className="block">
            Label
            <Input
              aria-label="Label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              required
            />
          </label>
          {save.error && <p role="alert">{save.error.message}</p>}
          <Button type="submit" disabled={save.isPending || !label.trim()}>
            Save label
          </Button>
          <Button type="button" variant="outline" onClick={() => setEditing(null)}>
            Cancel
          </Button>
        </form>
      )}
    </PageShell>
  )
}
