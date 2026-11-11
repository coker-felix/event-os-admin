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
      { id: 'bp-pub', title: 'Published plan', status: 'published', authorName: 'Ama', creditedOrgName: 'Accra Events', version: 2, forkCount: 4, publishedAt: '2026-07-13', snapshot: { name: 'Published plan', version: 2, tasks: [] } },
      { id: 'bp-hidden', title: 'Hidden plan', status: 'hidden', authorName: 'Kojo', creditedOrgName: 'Night Market', version: 1, forkCount: 0 },
      { id: 'bp-withdrawn', title: 'Withdrawn plan', status: 'withdrawn', authorName: 'Esi', creditedOrgName: '—', version: 1, forkCount: 0 },
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
