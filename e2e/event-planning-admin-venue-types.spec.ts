import { expect, test } from '@playwright/test'

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, PUT, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization',
}

test('edits venue type labels using the code path in the API', async ({ page }) => {
  await page.route('**/api/admin/**', async (route) =>
    route.fulfill({
      status: 200,
      headers: corsHeaders,
      contentType: 'application/json',
      body: '{}',
    }),
  )
  let label = 'Banquet hall'
  let requestPath = ''
  await page.route('**/api/admin/venue-types**', async (route) => {
    if (route.request().method() === 'GET')
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ types: [{ code: 'banquet_hall', label }] }),
      })
    requestPath = new URL(route.request().url()).pathname
    label = route.request().postDataJSON().label
    return route.fulfill({
      status: 200,
      headers: corsHeaders,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'banquet_hall', label }),
    })
  })
  await page.addInitScript(() =>
    sessionStorage.setItem(
      'event-os-admin-session',
      JSON.stringify({ token: 'admin-test-token', tokenType: 'Bearer' }),
    ),
  )
  await page.goto('/app/platform/venue-types')
  await page.getByRole('button', { name: 'Edit label for Banquet hall' }).click()
  await page.getByLabel('Label', { exact: true }).fill('Event hall')
  await page.getByRole('button', { name: 'Save label' }).click()
  await expect(page.getByRole('cell', { name: 'Event hall', exact: true })).toBeVisible()
  expect(requestPath).toBe('/api/admin/venue-types/banquet_hall')
})
