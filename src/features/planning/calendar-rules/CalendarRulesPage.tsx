import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AppDatePicker } from '@/components/ui/date-picker'
import {
  getCalendarRules,
  saveCalendarRule,
  type CalendarRule,
  type Holiday,
} from '@/services/admin-planning'
import { PageShell } from '../shared/PageShell'
import { PlanningError } from '../shared/PlanningState'
import { validateCalendarRule } from './validation'
import { CalendarRulesTable } from './CalendarRulesTable'

const weekendLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function CalendarRulesPage() {
  const { session } = useAuth()
  const client = useQueryClient()
  const query = useQuery({
    queryKey: ['planning-calendar'],
    queryFn: () => getCalendarRules(session!.token),
    enabled: Boolean(session?.token),
  })
  const [country, setCountry] = useState('')
  const [subdivision, setSubdivision] = useState('')
  const [weekendDays, setWeekendDays] = useState<number[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [date, setDate] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const save = useMutation({
    mutationFn: () => {
      const errors = validateCalendarRule(country, weekendDays, holidays)
      if (errors.length) throw new Error(errors.join(' '))
      return saveCalendarRule(session!.token, {
        countryCode: country,
        subdivisionCode: subdivision,
        weekendDays,
        holidays,
      })
    },
    onSuccess: () => {
      setError('')
      setFormOpen(false)
      void client.invalidateQueries({ queryKey: ['planning-calendar'] })
    },
    onError: (cause: Error) => setError(cause.message),
  })
  const open = (rule?: CalendarRule) => {
    setCountry(rule?.countryCode ?? '')
    setSubdivision(rule?.subdivisionCode ?? '')
    setWeekendDays(rule?.weekendDays ?? [])
    setHolidays(rule?.holidays ?? [])
    setFormOpen(true)
    setError('')
    save.reset()
  }
  const addHoliday = () => {
    const candidate = [...holidays, { date, name: name.trim() }]
    const errors = validateCalendarRule(country || 'GH', weekendDays, candidate)
    if (!date || !name.trim() || errors.some((item) => item.includes('Holiday'))) {
      setError(errors.find((item) => item.includes('Holiday')) ?? 'Enter a holiday date and name.')
      return
    }
    setHolidays(candidate)
    setDate('')
    setName('')
    setError('')
  }
  return (
    <PageShell
      title="Calendar rules"
      description="Set weekend days and holidays by country and subdivision."
      action={<Button onClick={() => open()}>New rule</Button>}
    >
      {query.isError ? (
        <PlanningError error={query.error} />
      ) : (
        <CalendarRulesTable
          rules={query.data?.rules ?? []}
          loading={query.isLoading}
          onEdit={open}
        />
      )}
      {formOpen && (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            save.mutate()
          }}
          className="space-y-3 rounded-lg border border-line bg-surface p-4"
        >
          <h2 className="font-semibold">Create or edit rule</h2>
          <label className="block">
            Country code
            <Input
              aria-label="Country code"
              maxLength={2}
              value={country}
              onChange={(event) => setCountry(event.target.value.toUpperCase())}
            />
          </label>
          <label className="block">
            Subdivision code (optional)
            <Input
              aria-label="Subdivision code (optional)"
              value={subdivision}
              onChange={(event) => setSubdivision(event.target.value)}
            />
          </label>
          <fieldset>
            <legend>Weekend days</legend>
            <div className="flex flex-wrap gap-3">
              {weekendLabels.map((label, day) => (
                <label key={label}>
                  <input
                    type="checkbox"
                    checked={weekendDays.includes(day)}
                    onChange={(event) =>
                      setWeekendDays(
                        event.target.checked
                          ? [...weekendDays, day].sort()
                          : weekendDays.filter((value) => value !== day),
                      )
                    }
                  />{' '}
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <label>
              Holiday date
              <AppDatePicker
                ariaLabel="Holiday date"
                value={date}
                onValueChange={(value) => setDate(value ?? '')}
              />
            </label>
            <label>
              Holiday name
              <Input
                aria-label="Holiday name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <Button type="button" variant="outline" onClick={addHoliday}>
              Add holiday
            </Button>
          </div>
          <ul>
            {holidays.map((holiday) => (
              <li key={holiday.date}>
                {holiday.date}: {holiday.name}
              </li>
            ))}
          </ul>
          {error && <p role="alert">{error}</p>}
          <Button disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save calendar rule'}
          </Button>
          <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
            Cancel
          </Button>
        </form>
      )}
    </PageShell>
  )
}
