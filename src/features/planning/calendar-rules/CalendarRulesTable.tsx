import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { TableCell, TableRow } from '@/components/ui/table'
import type { CalendarRule } from '@/services/admin-planning'

const weekendLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function CalendarRulesTable({
  rules,
  loading,
  onEdit,
}: {
  rules: CalendarRule[]
  loading: boolean
  onEdit: (rule: CalendarRule) => void
}) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="p-0">
        <DataTable
          data={rules}
          label="Calendar rules"
          headers={['Country', 'Subdivision', 'Weekend days', 'Holidays', 'Actions']}
          loading={loading}
          loadingMessage="Loading calendar rules…"
          emptyMessage="No calendar rules configured."
          containerClassName=""
          renderRow={(rule) => (
            <TableRow key={`${rule.countryCode}-${rule.subdivisionCode}`}>
              <TableCell>{rule.countryCode}</TableCell>
              <TableCell>{rule.subdivisionCode || '—'}</TableCell>
              <TableCell>
                {(rule.weekendDays ?? []).map((day) => weekendLabels[day] ?? '—').join(', ')}
              </TableCell>
              <TableCell>{rule.holidays?.length ?? 0}</TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  aria-label={`Edit calendar rule for ${rule.countryCode} ${rule.subdivisionCode}`}
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
