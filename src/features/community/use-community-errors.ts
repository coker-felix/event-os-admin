const reasonMessages: Record<string, string> = {
  forbidden: 'You need the community moderation permission.',
  not_found: 'This item no longer exists',
  duplicate: 'Already done or changed',
  invalid_state: 'Already done or changed',
  slug_taken: 'That slug is already in use',
  not_appealable: "This appeal can't be decided",
}

export function communityErrorMessage(error: unknown): string {
  if (typeof error !== 'object' || error === null) return 'Something went wrong. Please try again.'
  const value = error as { reason?: unknown; status?: unknown; message?: unknown }
  if (typeof value.reason === 'string' && reasonMessages[value.reason]) return reasonMessages[value.reason]
  if (value.reason === 'invalid_input' && typeof value.message === 'string' && value.message) return value.message
  if (value.reason == null && value.status === 403) return reasonMessages.forbidden
  if (value.reason == null && value.status === 404) return reasonMessages.not_found
  if (typeof value.message === 'string' && value.message) return value.message
  return 'Something went wrong. Please try again.'
}

export function useCommunityErrors(error: unknown) {
  return communityErrorMessage(error)
}
