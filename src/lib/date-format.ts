export type ISODate = string

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function dateParts(value: string | null | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '')
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]

  return month >= 1 && month <= 12 && day >= 1 && day <= (daysInMonth ?? 0)
    ? { year, month, day }
    : null
}

function ordinal(day: number) {
  const lastTwoDigits = day % 100
  const suffix = lastTwoDigits >= 11 && lastTwoDigits <= 13
    ? 'th'
    : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] ?? 'th'
  return `${day}${suffix}`
}

/** Formats an ISO calendar date without constructing a Date or applying a timezone. */
export function formatDate(value: string | null | undefined) {
  const parts = dateParts(value)
  if (!parts) return '—'
  return `${ordinal(parts.day)} ${MONTHS[parts.month - 1]} ${String(parts.year).slice(-2)}`
}

export function formatPeriod(start: string, end?: string | null) {
  return `${formatDate(start)} ${end ? `to ${formatDate(end)}` : 'onwards'}`
}

export function isoDateFromParts(year: number, month: number, day: number): ISODate {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function calendarDateFromISO(value: ISODate | null | undefined): Date | undefined {
  const parts = dateParts(value)
  return parts ? new Date(parts.year, parts.month - 1, parts.day) : undefined
}
