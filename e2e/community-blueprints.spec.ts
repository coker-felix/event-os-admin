import { expect, test } from '@playwright/test'

test.use({ trace: 'off' })

const cors = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'authorization, content-type' }

test('blueprint filters and moderation actions follow status and require a reason', async ({ page }) => {
  let status = ''
  let actions: string[] = []
  await page.route('**/api/admin/community/blueprints**', async route => {
    const url = new URL(route.request().url())
    status = url.searchParams.get('status') ?? ''
    const all = [
      { id: 'bp-pub', title: 'Published plan', summary: '', authorUserId: 'user-1', status: 'published', authorName: 'Ama', creditedOrgId: 'org-1', currentVersion: 2, forkCount: 4, createdAt: '2026-07-13T10:00:00Z' },
      { id: 'bp-hidden', title: 'Hidden plan', summary: '', authorUserId: 'user-2', status: 'hidden', authorName: 'Kojo', creditedOrgId: 'org-2', currentVersion: 1, forkCount: 0, createdAt: '2026-07-12T10:00:00Z' },
      { id: 'bp-withdrawn', title: 'Withdrawn plan', summary: '', authorUserId: 'user-3', status: 'withdrawn', authorName: 'Esi', creditedOrgId: '', currentVersion: 1, forkCount: 0, createdAt: '2026-07-11T10:00:00Z' },
    ]
    const blueprints = status ? all.filter(item => item.status === status) : all
    return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ blueprints, total: blueprints.length }) })
  })
  await page.route('**/api/admin/community/moderation-actions', async route => {
    actions.push(String(route.request().postDataJSON().action))
    await route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: '{}' })
  })
  await page.addInitScript(() => sessionStorage.setItem('event-os-admin-session', JSON.stringify({ token: 'admin-test-token', tokenType: 'Bearer' })))
  await page.goto('/app/community/blueprints')
  const published = page.getByRole('row').filter({ hasText: 'Published plan' })
  await expect(published.getByRole('button', { name: 'Hide' })).toBeVisible()
  await expect(published.getByRole('button', { name: 'Restore' })).toHaveCount(0)
  await expect(published.getByRole('button', { name: 'Withdraw' })).toBeVisible()
  await page.getByRole('button', { name: 'Hidden' }).click()
  await expect(page).toHaveURL(/blueprints/)
  await expect(page.getByRole('row').filter({ hasText: 'Hidden plan' }).getByRole('button', { name: 'Restore' })).toBeVisible()
  await page.getByRole('button', { name: 'All' }).click()
  const row = page.getByRole('row').filter({ hasText: 'Published plan' })
  await row.getByRole('button', { name: 'Withdraw' }).click()
  await expect(page.getByRole('button', { name: 'Submit action' })).toBeDisabled()
  await page.getByLabel('Reason').fill('Risky details were shared')
  await page.getByRole('button', { name: 'Submit action' }).click()
  await expect.poll(() => actions).toContain('withdraw')
})
