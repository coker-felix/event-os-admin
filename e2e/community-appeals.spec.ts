import { expect, test } from '@playwright/test'

test.use({ trace: 'off' })

const cors = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'authorization, content-type' }
const adminId = 'admin-original'
const token = `e30.${btoa(JSON.stringify({ sub: adminId }))}.sig`

test('appeals prevent the original moderator deciding and explain a forbidden decision', async ({ page }) => {
  await page.route('**/api/admin/community/appeals*', route => route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ appeals: [
    { id: 'appeal-own', userId: 'user-1', status: 'open', reason: 'I disagree', note: 'Please review this decision', submittedAt: '2026-07-13T10:00:00Z', action: { type: 'hide', moderatorUserId: adminId } },
    { id: 'appeal-other', userId: 'user-2', status: 'open', reason: 'Wrong target', note: 'This was not my post', submittedAt: '2026-07-12T10:00:00Z', action: { type: 'suspend_user', moderatorUserId: 'admin-other' } },
  ], total: 2 }) }))
  await page.route('**/api/admin/community/appeals/appeal-other/decide', route => route.fulfill({ status: 403, headers: cors, contentType: 'application/json', body: JSON.stringify({ error: 'Forbidden', reason: 'forbidden' }) }))
  await page.addInitScript((sessionToken) => sessionStorage.setItem('event-os-admin-session', JSON.stringify({ token: sessionToken, tokenType: 'Bearer' })), token)
  await page.goto('/app/community/appeals')
  const ownRow = page.getByRole('row').filter({ hasText: 'user-1' })
  await expect(ownRow.getByRole('button', { name: 'Decide' })).toBeDisabled()
  await expect(page.getByText('Another moderator must decide this appeal').first()).toBeVisible()
  const otherRow = page.getByRole('row').filter({ hasText: 'user-2' })
  await otherRow.getByRole('button', { name: 'Decide' }).click()
  await page.getByLabel('Decision note').fill('Reviewed independently')
  await page.getByRole('button', { name: 'Submit decision' }).click()
  await expect(page.getByText('Another moderator must decide this appeal')).toBeVisible()
})
