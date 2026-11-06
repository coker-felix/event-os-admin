import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { TableCell, TableRow } from '@/components/ui/table'
import type { StaffingRule } from '@/services/admin-planning'

export function StaffingRulesTable({
  rules,
  loading,
  error,
  onEdit,
}: {
  rules: StaffingRule[]
  loading: boolean
  error: string | null
  onEdit: (rule: StaffingRule) => void
}) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="p-0">
        <DataTable
          data={rules}
          label="Staffing rules"
          headers={[
            'Role',
            'Event type',
            'Service style',
            'Guests per staff',
            'Min staff',
            'Active',
            'Actions',
          ]}
          loading={loading}
          loadingMessage="Loading staffing rules…"
          error={error}
          emptyMessage="No staffing rules configured."
          containerClassName=""
          renderRow={(rule) => (
            <TableRow key={rule.id}>
              <TableCell>{rule.role}</TableCell>
              <TableCell>{rule.eventType}</TableCell>
              <TableCell>{rule.serviceStyle}</TableCell>
              <TableCell>{rule.guestsPerStaff}</TableCell>
              <TableCell>{rule.minStaff}</TableCell>
              <TableCell>{rule.active ? 'Active' : 'Inactive'}</TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  aria-label={`Edit rule for ${rule.role}, ${rule.eventType}, ${rule.serviceStyle}`}
                  onClick={() => onEdit(rule)}
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
