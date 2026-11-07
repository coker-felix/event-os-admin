import type { VenueSpecField } from '@/services/admin-planning'

export type VenueSpecFieldInput = Omit<VenueSpecField, 'enumValues'> & { enumValues: string[] }

export function validateVenueSpecField(value: VenueSpecFieldInput): string[] {
  const errors: string[] = []
  if (!/^[a-z][a-z0-9_]*$/.test(value.code))
    errors.push('Code must use snake_case and start with a lowercase letter.')
  if (!value.label.trim()) errors.push('Label is required.')
  if (!['bool', 'int', 'decimal', 'text', 'enum'].includes(value.valueType))
    errors.push('Choose a valid value type.')
  if (
    value.valueType === 'enum' &&
    (!value.enumValues.length || value.enumValues.some((item) => !item))
  )
    errors.push('Enum values are required.')
  if (new Set(value.enumValues).size !== value.enumValues.length)
    errors.push('Enum values must be unique.')
  return errors
}
