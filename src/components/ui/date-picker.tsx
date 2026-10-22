import { CalendarBlankIcon } from '@phosphor-icons/react'
import { cn } from 'cn'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { calendarDateFromISO, formatDate, isoDateFromParts, type ISODate } from '@/lib/date-format'

export interface AppDatePickerProps {
  value?: ISODate | null
  onValueChange: (value: ISODate | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function AppDatePicker({
  value,
  onValueChange,
  placeholder = 'Pick a date',
  disabled,
  className,
}: AppDatePickerProps) {
  const selectedDate = calendarDateFromISO(value)

  return (
    <Popover>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            variant="outline"
            data-empty={!value}
            className={cn("justify-start text-left font-normal data-[empty=true]:text-muted-foreground", className)}
          />
        }
      >
        <CalendarBlankIcon data-icon="inline-start" />
        {value ? formatDate(value) : <span>{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => onValueChange(date ? isoDateFromParts(date.getFullYear(), date.getMonth() + 1, date.getDate()) : null)}
        />
      </PopoverContent>
    </Popover>
  )
}

/** @deprecated Use AppDatePicker and keep values as ISO calendar date strings. */
export const DatePicker = AppDatePicker
