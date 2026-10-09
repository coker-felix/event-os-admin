import { format } from 'date-fns'
import { CalendarBlankIcon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export interface DatePickerProps {
  value?: Date
  onValueChange: (value: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
}

export function DatePicker({
  value,
  onValueChange,
  placeholder = 'Pick a date',
  disabled,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            variant="outline"
            data-empty={!value}
            className="justify-start text-left font-normal data-[empty=true]:text-muted-foreground"
          />
        }
      >
        <CalendarBlankIcon data-icon="inline-start" />
        {value ? format(value, 'PPP') : <span>{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar mode="single" selected={value} onSelect={onValueChange} />
      </PopoverContent>
    </Popover>
  )
}
