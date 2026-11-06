import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import type { StaffingRule } from '@/services/admin-planning'
import {
  staffingEventTypes,
  staffingRoles,
  staffingServiceStyles,
  validateStaffingRule,
} from './validation'

export function StaffingRuleForm({
  initialValue,
  pending,
  serverError,
  onCancel,
  onSave,
}: {
  initialValue: StaffingRule | null
  pending: boolean
  serverError: string
  onCancel: () => void
  onSave: (value: Omit<StaffingRule, 'id'>) => void
}) {
  const [role, setRole] = useState('waiter')
  const [eventType, setEventType] = useState('casual')
  const [serviceStyle, setServiceStyle] = useState('buffet')
  const [guestsPerStaff, setGuestsPerStaff] = useState('1')
  const [minStaff, setMinStaff] = useState('0')
  const [active, setActive] = useState(true)
  const [validationError, setValidationError] = useState('')
  useEffect(() => {
    setRole(initialValue?.role ?? 'waiter')
    setEventType(initialValue?.eventType ?? 'casual')
    setServiceStyle(initialValue?.serviceStyle ?? 'buffet')
    setGuestsPerStaff(String(initialValue?.guestsPerStaff ?? 1))
    setMinStaff(String(initialValue?.minStaff ?? 0))
    setActive(initialValue?.active ?? true)
    setValidationError('')
  }, [initialValue])
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = {
      role,
      eventType,
      serviceStyle,
      guestsPerStaff: Number(guestsPerStaff),
      minStaff: Number(minStaff),
      active,
    }
    const errors = validateStaffingRule(value)
    if (errors.length) {
      setValidationError(errors.join(' '))
      return
    }
    setValidationError('')
    onSave(value)
  }
  return (
    <form
      noValidate
      onSubmit={submit}
      className="space-y-3 rounded-lg border border-line bg-surface p-4"
    >
      <h2 className="font-semibold">
        {initialValue ? 'Edit staffing rule' : 'Create staffing rule'}
      </h2>
      <label className="block">
        Role
        <select aria-label="Role" value={role} onChange={(event) => setRole(event.target.value)}>
          {staffingRoles.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label className="block">
        Event type
        <select
          aria-label="Event type"
          value={eventType}
          onChange={(event) => setEventType(event.target.value)}
        >
          {staffingEventTypes.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label className="block">
        Service style
        <select
          aria-label="Service style"
          value={serviceStyle}
          onChange={(event) => setServiceStyle(event.target.value)}
        >
          {staffingServiceStyles.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label className="block">
        Guests per staff
        <Input
          aria-label="Guests per staff"
          type="number"
          min="1"
          step="1"
          value={guestsPerStaff}
          onChange={(event) => setGuestsPerStaff(event.target.value)}
        />
      </label>
      <label className="block">
        Minimum staff
        <Input
          aria-label="Minimum staff"
          type="number"
          min="0"
          step="1"
          value={minStaff}
          onChange={(event) => setMinStaff(event.target.value)}
        />
      </label>
      <label className="flex items-center gap-2">
        Active
        <Switch aria-label="Active" checked={active} onCheckedChange={setActive} />
      </label>
      {validationError && <p role="alert">{validationError}</p>}
      {serverError && <p role="alert">{serverError}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save rule'}
      </Button>
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
    </form>
  )
}
