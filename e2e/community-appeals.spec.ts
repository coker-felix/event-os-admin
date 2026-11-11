import { expect, test } from '@playwright/test'

test.use({ trace: 'off' })

const cors = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'authorization, content-type' }
const adminId = 'admin-original'
const token = `e30.${btoa(JSON.stringify({ sub: adminId }))}.sig`

test('appeals prevent the original moderator deciding and explain a forbidden decision', async ({ page }) => {
  await page.route('**/api/admin/community/appeals*', route => route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ appeals: [
    { id: 'appeal-own', actionId: 'action-1', userId: 'user-1', user: { userId: 'user-1', displayName: 'Ama Mensah' }, status: 'open', note: 'Please review this decision', createdAt: '2026-07-13T10:00:00Z', decidedBy: '', action: { id: 'action-1', action: 'hide', reason: 'I disagree', targetType: 'blueprint', targetId: 'bp-1', moderatorUserId: adminId } },
    { id: 'appeal-other', actionId: 'action-2', userId: 'user-2', user: { userId: 'user-2', displayName: 'Kojo Boateng' }, status: 'open', note: 'This was not my post', createdAt: '2026-07-12T10:00:00Z', decidedBy: '', action: { id: 'action-2', action: 'suspend_user', reason: 'Wrong target', targetType: 'user', targetId: 'user-2', moderatorUserId: 'admin-other' } },
  ], total: 2 }) }))
  await page.route('**/api/admin/community/appeals/appeal-other/decide', route => route.fulfill({ status: 403, headers: cors, contentType: 'application/json', body: JSON.stringify({ error: 'Forbidden', reason: 'forbidden' }) }))
  await page.addInitScript((sessionToken) => sessionStorage.setItem('event-os-admin-session', JSON.stringify({ token: sessionToken, tokenType: 'Bearer' })), token)
  await page.goto('/app/community/appeals')
  const ownRow = page.getByRole('row').filter({ hasText: 'user-1' })
  await expect(ownRow.getByRole('button', { name: 'Decide' })).toBeDisabled()
  await ownRow.getByRole('button', { name: 'Decide' }).hover()
  await expect(page.getByText('Another moderator must decide this appeal').first()).toBeVisible()
  const otherRow = page.getByRole('row').filter({ hasText: 'user-2' })
  await otherRow.getByRole('button', { name: 'Decide' }).click()
  await page.getByLabel('Decision note').fill('Reviewed independently')
  await page.getByRole('button', { name: 'Submit decision' }).click()
  await expect(page.getByText('Another moderator must decide this appeal')).toBeVisible()
})
