import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getVenueFields,
  getVenueTypes,
  saveVenueField,
  type VenueSpecField,
} from '@/services/admin-planning'
import { PageShell } from '../shared/PageShell'
import { PlanningError } from '../shared/PlanningState'
import { validateVenueSpecField } from './validation'
import { VenueSpecFieldsTable } from './VenueSpecFieldsTable'

export function VenueSpecFieldsPage() {
  const { session } = useAuth()
  const client = useQueryClient()
  const fieldsQuery = useQuery({
    queryKey: ['planning-fields'],
    queryFn: () => getVenueFields(session!.token),
    enabled: Boolean(session?.token),
  })
  const typesQuery = useQuery({
    queryKey: ['planning-types'],
    queryFn: () => getVenueTypes(session!.token),
    enabled: Boolean(session?.token),
  })
  const [editing, setEditing] = useState<VenueSpecField | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [valueType, setValueType] = useState<VenueSpecField['valueType']>('text')
  const [unit, setUnit] = useState('')
  const [enumText, setEnumText] = useState('')
  const [appliesToTypes, setAppliesToTypes] = useState<string[]>([])
  const [validationError, setValidationError] = useState('')
  const save = useMutation({
    mutationFn: () => {
      const payload = {
        code,
        label,
        valueType,
        unit,
        enumValues:
          valueType === 'enum'
            ? enumText
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean)
            : [],
        appliesToTypes,
      }
      const errors = validateVenueSpecField(payload)
      if (errors.length) throw new Error(errors.join(' '))
      return saveVenueField(
        session!.token,
        { label, valueType, unit, enumValues: payload.enumValues, appliesToTypes },
        editing?.code ?? code,
      )
    },
    onSuccess: () => {
      closeForm()
      void client.invalidateQueries({ queryKey: ['planning-fields'] })
    },
    onError: (error: Error) => setValidationError(error.message),
  })
  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
    setCode('')
    setLabel('')
    setValueType('text')
    setUnit('')
    setEnumText('')
    setAppliesToTypes([])
    setValidationError('')
  }
  const open = (field?: VenueSpecField) => {
    setFormOpen(true)
    setEditing(field ?? null)
    setCode(field?.code ?? '')
    setLabel(field?.label ?? '')
    setValueType(field?.valueType ?? 'text')
    setUnit(field?.unit ?? '')
    setEnumText(field?.enumValues?.join(', ') ?? '')
    setAppliesToTypes(field?.appliesToTypes ?? [])
    setValidationError('')
    save.reset()
  }
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    save.mutate()
  }
  return (
    <PageShell
      title="Venue spec fields"
      description="Configure technical fields available on venue profiles."
      action={<Button onClick={() => open()}>New field</Button>}
    >
      {fieldsQuery.isError ? (
        <PlanningError error={fieldsQuery.error} />
      ) : (
        <VenueSpecFieldsTable
          fields={fieldsQuery.data?.fields ?? []}
          loading={fieldsQuery.isLoading}
          onEdit={open}
        />
      )}
      {formOpen && (
        <form
          onSubmit={submit}
          className="grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-2"
        >
          <h2 className="font-semibold sm:col-span-2">
            {editing ? `Edit ${editing.label}` : 'Create venue spec field'}
          </h2>
          <label>
            Code
            <Input
              aria-label="Code"
              value={code}
              readOnly={Boolean(editing)}
              onChange={(event) => setCode(event.target.value.toLowerCase())}
            />
          </label>
          <label>
            Label
            <Input
              aria-label="Label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </label>
          <label>
            Value type
            <select
              aria-label="Value type"
              value={valueType}
              onChange={(event) => setValueType(event.target.value as VenueSpecField['valueType'])}
            >
              {['bool', 'int', 'decimal', 'text', 'enum'].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Unit
            <Input
              aria-label="Unit"
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
            />
          </label>
          {valueType === 'enum' && (
            <label>
              Enum values (comma separated)
              <Input
                aria-label="Enum values (comma separated)"
                value={enumText}
                onChange={(event) => setEnumText(event.target.value)}
              />
            </label>
          )}
          <fieldset className="sm:col-span-2">
            <legend>Applies to types</legend>
            {typesQuery.isLoading && <p role="status">Loading venue types…</p>}
            {typesQuery.isError && <p role="alert">{typesQuery.error.message}</p>}
            {!typesQuery.isLoading &&
              !typesQuery.isError &&
              (typesQuery.data?.types ?? []).length === 0 && <p>No venue types are available.</p>}
            {(typesQuery.data?.types ?? []).map((type) => (
              <label key={type.code} className="mr-3">
                <input
                  type="checkbox"
                  checked={appliesToTypes.includes(type.code)}
                  onChange={(event) =>
                    setAppliesToTypes(
                      event.target.checked
                        ? [...appliesToTypes, type.code]
                        : appliesToTypes.filter((item) => item !== type.code),
                    )
                  }
                />{' '}
                {type.label}
              </label>
            ))}
            <p className="text-sm text-ink-muted">No selection = applies to every type.</p>
          </fieldset>
          {(validationError || save.error) && (
            <p role="alert" className="sm:col-span-2">
              {validationError || save.error?.message}
            </p>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save field'}
            </Button>
            <Button type="button" variant="outline" onClick={closeForm}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </PageShell>
  )
}
