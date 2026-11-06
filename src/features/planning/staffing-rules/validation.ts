export const staffingRoles = ['waiter', 'bartender', 'security', 'usher', 'cleaner'] as const
export const staffingEventTypes = ['casual', 'formal', 'gala'] as const
export const staffingServiceStyles = ['buffet', 'plated', 'stations', 'cocktail'] as const

export interface StaffingRuleInput {
  role: string
  eventType: string
  serviceStyle: string
  guestsPerStaff: number
  minStaff: number
}

export function validateStaffingRule(value: StaffingRuleInput): string[] {
  const errors: string[] = []
  if (!staffingRoles.includes(value.role as (typeof staffingRoles)[number]))
    errors.push('Choose a valid role.')
  if (!staffingEventTypes.includes(value.eventType as (typeof staffingEventTypes)[number]))
    errors.push('Choose a valid event type.')
  if (!staffingServiceStyles.includes(value.serviceStyle as (typeof staffingServiceStyles)[number]))
    errors.push('Choose a valid service style.')
  if (!Number.isInteger(value.guestsPerStaff) || value.guestsPerStaff < 1)
    errors.push('Guests per staff must be an integer ≥ 1.')
  if (!Number.isInteger(value.minStaff) || value.minStaff < 0)
    errors.push('Minimum staff must be an integer ≥ 0.')
  return errors
}
