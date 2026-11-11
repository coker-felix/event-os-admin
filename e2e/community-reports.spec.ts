import { expect, test } from '@playwright/test'

test.use({ trace: 'off' })

const headers = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'authorization, content-type' }
const report = (id: string, status: string, targetStatus: string) => ({ id, reporterUserId: 'reporter-1', targetType: 'blueprint', targetId: 'bp-1', reason: 'Misleading details', details: '', status, createdAt: '2026-07-13T10:00:00Z', openReportCount: 3, targetPreview: { title: 'Community garden plan', excerpt: 'A detailed plan for a community garden.', status: targetStatus, authorUserId: 'user-1', authorName: 'Ama Mensah', authorSuspended: false } })

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('event-os-admin-session', JSON.stringify({ token: 'admin-test-token', tokenType: 'Bearer' })))
})

test('AD-2: Hide and Restore only appear for qualifying target states', async ({ page }) => {
  await page.route('**/api/admin/community/reports**', async (route) => route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ reports: [report('r-published', 'open', 'published'), report('r-hidden', 'open', 'hidden')], total: 2 }) }))
  await page.goto('/app/community/reports')
  const rows = page.getByRole('row').filter({ hasText: 'Community garden plan' })
  await expect(rows.nth(0).getByRole('button', { name: 'Hide' })).toBeVisible()
  await expect(rows.nth(0).getByRole('button', { name: 'Restore' })).toHaveCount(0)
  await expect(rows.nth(1).getByRole('button', { name: 'Restore' })).toBeVisible()
  await expect(rows.nth(1).getByRole('button', { name: 'Hide' })).toHaveCount(0)
})

test('AD-4: Dismiss removes the report from Open without changing target status', async ({ page }) => {
  let dismissed = false
  await page.route('**/api/admin/community/reports**', async (route) => route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ reports: dismissed ? [] : [report('r-open', 'open', 'published')], total: dismissed ? 0 : 1 }) }))
  await page.route('**/api/admin/community/moderation-actions', async (route) => {
    const body = route.request().postDataJSON()
    expect(body).toMatchObject({ action: 'dismiss', reportId: 'r-open', targetType: 'blueprint', targetId: 'bp-1' })
    dismissed = true
    await route.fulfill({ status: 200, headers, contentType: 'application/json', body: '{}' })
  })
  await page.goto('/app/community/reports')
  await page.getByRole('button', { name: 'Dismiss' }).click()
  await page.getByLabel('Reason').fill('Reviewed and not actionable')
  await page.getByRole('button', { name: 'Submit action' }).click()
  await expect(page.getByText('No open reports')).toBeVisible()
})

test('AD-8: Empty open queue has explicit copy', async ({ page }) => {
  await page.route('**/api/admin/community/reports**', async (route) => route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ reports: [], total: 0 }) }))
  await page.goto('/app/community/reports')
  await expect(page.getByText('No open reports')).toBeVisible()
})

test('AD-9: Pagination reports the server total', async ({ page }) => {
  await page.route('**/api/admin/community/reports**', async (route) => route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ reports: Array.from({ length: 10 }, (_, index) => report(`r-${index}`, 'open', 'published')), total: 47 }) }))
  await page.goto('/app/community/reports')
  await expect(page.getByText('Showing 1 to 1 of 47')).toBeVisible()
})

test('Report detail lists every report on the target', async ({ page }) => {
  await page.route('**/api/admin/community/reports**', async (route) => {
    const status = new URL(route.request().url()).searchParams.get('status')
    const items = status === 'dismissed' ? [report('r-dismissed', 'dismissed', 'published')] : [report('r-open', 'open', 'published'), report('r-actioned', 'actioned', 'published')]
    await route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ reports: items, total: items.length }) })
  })
  await page.goto('/app/community/reports')
  await page.getByRole('row').filter({ hasText: 'Community garden plan' }).first().click()
  await expect(page.getByText('Reports on this target')).toBeVisible()
  await expect(page.getByText('Misleading details').first()).toBeVisible()
  await expect(page.getByText('A detailed plan for a community garden.')).toBeVisible()
})
