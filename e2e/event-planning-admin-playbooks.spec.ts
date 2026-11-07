import { expect, test } from '@playwright/test'

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, PUT, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization',
}

test('blocks dependency cycles with path and saves a valid platform playbook', async ({ page }) => {
  await page.route('**/api/admin/**', async (route) =>
    route.fulfill({
      status: 200,
      headers: corsHeaders,
      contentType: 'application/json',
      body: '{}',
    }),
  )
  let playbooks: unknown[] = []
  await page.route('**/api/admin/playbooks**', async (route) => {
    if (route.request().method() === 'GET')
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ playbooks, total: playbooks.length }),
      })
    const saved = { id: 'book-1', version: 1, ...route.request().postDataJSON() }
    playbooks = [saved]
    return route.fulfill({
      status: 200,
      headers: corsHeaders,
      contentType: 'application/json',
      body: JSON.stringify(saved),
    })
  })
  await page.route('**/api/admin/**', async (route) => {
    if (route.request().method() === 'OPTIONS')
      return route.fulfill({ status: 204, headers: corsHeaders })
    return route.fallback()
  })
  await page.addInitScript(() =>
    sessionStorage.setItem(
      'event-os-admin-session',
      JSON.stringify({ token: 'admin-test-token', tokenType: 'Bearer' }),
    ),
  )
  await page.goto('/app/platform/playbooks')
  await page.getByRole('button', { name: 'Create playbook' }).click()
  await page.getByLabel('Playbook name').fill('Gala preparation')
  await page.getByLabel('Task 1 title').fill('Confirm venue')
  await page.getByRole('button', { name: 'Add task' }).click()
  await page.getByLabel('Task 2 title').fill('Approve layout')
  await page.getByLabel('Task 1 dependencies').selectOption({ index: 0 })
  await page.getByLabel('Task 2 dependencies').selectOption({ index: 0 })
  await expect(page.getByRole('alert').filter({ hasText: 'Dependency cycle' })).toContainText(
    'Confirm venue',
  )
  await page.getByLabel('Task 1 dependencies').selectOption([])
  await page.getByRole('button', { name: 'Save playbook' }).click()
  await expect(page.getByText('Gala preparation', { exact: true })).toBeVisible()
})
