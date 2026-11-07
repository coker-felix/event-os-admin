import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { TableCell, TableRow } from '@/components/ui/table'
import type { VenueSpecField } from '@/services/admin-planning'

export function VenueSpecFieldsTable({
  fields,
  loading,
  onEdit,
}: {
  fields: VenueSpecField[]
  loading: boolean
  onEdit: (field: VenueSpecField) => void
}) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="p-0">
        <DataTable
          data={fields}
          label="Venue spec fields"
          headers={['Code', 'Label', 'Value type', 'Unit', 'Enum values', 'Applies to', 'Actions']}
          loading={loading}
          loadingMessage="Loading venue spec fields…"
          emptyMessage="No venue spec fields configured."
          containerClassName=""
          renderRow={(field) => (
            <TableRow key={field.code}>
              <TableCell>{field.code}</TableCell>
              <TableCell>{field.label}</TableCell>
              <TableCell>{field.valueType}</TableCell>
              <TableCell>{field.unit || '—'}</TableCell>
              <TableCell>{field.enumValues?.join(', ') || '—'}</TableCell>
              <TableCell>{field.appliesToTypes?.join(', ') || 'All types'}</TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  aria-label={`Edit field ${field.label}`}
                  onClick={() => onEdit(field)}
                >
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          )}
        />
      </CardContent>
    </Card>
  )
}
