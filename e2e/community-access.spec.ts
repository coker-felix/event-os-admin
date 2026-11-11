import { expect, test } from '@playwright/test'

test.use({ trace: 'off' })

const corsHeaders = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-allow-headers': 'authorization, content-type' }

test('Community navigation exposes the six moderation routes', async ({ page }) => {
  await page.route('**/api/admin/**', async (route) => route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ name: 'Community Admin' }) }))
  await page.addInitScript(() => sessionStorage.setItem('event-os-admin-session', JSON.stringify({ token: 'admin-test-token', tokenType: 'Bearer' })))
  await page.goto('/app/community')
  await expect(page).toHaveURL(/\/app\/community\/reports$/)
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()
  for (const label of ['Reports', 'Appeals', 'Blueprints', 'Suspensions', 'Badges', 'Skills']) {
    await expect(page.getByRole('link', { name: label }).first()).toBeVisible()
  }
})
