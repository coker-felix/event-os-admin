import type { CommunityReport, TargetPreview } from '@/services/admin-community'

export type ModerationAction = 'hide' | 'restore' | 'withdraw' | 'suspend_user' | 'dismiss'
export type ModerationRow = Pick<CommunityReport, 'status' | 'targetType'> & { targetPreview: TargetPreview }

export function availableActions(row: ModerationRow): ModerationAction[] {
  const actions: ModerationAction[] = []
  const target = row.targetPreview
  if (target.status === 'published') actions.push('hide')
  if (target.status === 'hidden') actions.push('restore')
  if (row.targetType === 'blueprint' && target.status !== 'withdrawn') actions.push('withdraw')
  if (!target.authorSuspended) actions.push('suspend_user')
  if (row.status === 'open') actions.push('dismiss')
  return actions
}
