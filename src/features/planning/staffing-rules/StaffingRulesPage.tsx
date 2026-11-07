import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import { Button } from '@/components/ui/button'
import { getStaffingRules, saveStaffingRule, type StaffingRule } from '@/services/admin-planning'
import { PageShell } from '../shared/PageShell'
import { PlanningError } from '../shared/PlanningState'
import { StaffingRuleForm } from './StaffingRuleForm'
import { StaffingRulesTable } from './StaffingRulesTable'

export function StaffingRulesPage() {
  const { session } = useAuth()
  const client = useQueryClient()
  const [editing, setEditing] = useState<StaffingRule | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const query = useQuery({
    queryKey: ['planning-staffing'],
    queryFn: () => getStaffingRules(session!.token),
    enabled: Boolean(session?.token),
  })
  const save = useMutation({
    mutationFn: (value: Omit<StaffingRule, 'id'>) =>
      saveStaffingRule(session!.token, value, editing?.id),
    onSuccess: (saved) => {
      setFormOpen(false)
      setEditing(null)
      client.setQueryData<{ rules?: StaffingRule[] | null }>(['planning-staffing'], (current) => {
        const rules = current?.rules ?? []
        return { ...current, rules: [...rules.filter((rule) => rule.id !== saved.id), saved] }
      })
      void client.invalidateQueries({ queryKey: ['planning-staffing'] })
    },
  })
  const edit = (value: StaffingRule | null) => {
    setEditing(value)
    setFormOpen(true)
    save.reset()
  }
  return (
    <PageShell
      title="Staffing rules"
      description="Configure illustrative staffing ratios by event and service style."
      action={<Button onClick={() => edit(null)}>Add rule</Button>}
    >
      <p className="text-sm text-ink-muted">
        Default ratios are illustrative and are not validated standards.
      </p>
      {query.isError ? (
        <PlanningError error={query.error} />
      ) : (
        <StaffingRulesTable
          rules={query.data?.rules ?? []}
          loading={query.isLoading}
          error={null}
          onEdit={edit}
        />
      )}
      {formOpen && (
        <StaffingRuleForm
          initialValue={editing}
          pending={save.isPending}
          serverError={save.error?.message ?? ''}
          onCancel={() => setFormOpen(false)}
          onSave={(value) => save.mutate(value)}
        />
      )}
    </PageShell>
  )
}
