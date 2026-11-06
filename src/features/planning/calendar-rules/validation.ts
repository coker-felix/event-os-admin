import type { Holiday } from '@/services/admin-planning'

export function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function validateCalendarRule(countryCode: string, weekendDays: number[], holidays: Holiday[]): string[] {
  const errors: string[] = []
  if (!/^[A-Z]{2}$/.test(countryCode)) errors.push('Country code must be ISO alpha-2 in uppercase.')
  if (new Set(weekendDays).size === 7 && weekendDays.every((day) => day >= 0 && day <= 6)) errors.push('Weekend days cannot include all seven days.')
  const dates = holidays.map((holiday) => holiday.date)
  if (holidays.some((holiday) => !isCalendarDate(holiday.date))) errors.push('Holiday dates must be valid calendar dates.')
  if (new Set(dates).size !== dates.length) errors.push('Holiday dates must be unique.')
  if (holidays.some((holiday) => !holiday.name.trim())) errors.push('Holiday names are required.')
  return errors
}
