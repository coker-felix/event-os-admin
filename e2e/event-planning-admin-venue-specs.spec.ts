import { expect, test } from '@playwright/test'

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, PUT, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization',
}

test('verifies a declared venue spec field', async ({ page }) => {
  await page.route('**/api/admin/**', async (route) =>
    route.fulfill({
      status: 200,
      headers: corsHeaders,
      contentType: 'application/json',
      body: '{}',
    }),
  )
  let verified = false
  await page.route('**/api/admin/venues/venue-1/specs**', async (route) => {
    if (route.request().method() === 'GET')
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          venueType: 'banquet_hall',
          fields: [
            {
              code: 'capacity',
              label: 'Guest capacity',
              valueType: 'int',
              unit: 'people',
              value: 450,
              source: verified ? 'verified' : 'declared',
              updatedAt: 0,
              stale: false,
              known: true,
            },
          ],
        }),
      })
    verified = true
    return route.fulfill({
      status: 200,
      headers: corsHeaders,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 'capacity',
        label: 'Guest capacity',
        valueType: 'int',
        unit: 'people',
        value: 450,
        source: 'verified',
        updatedAt: 0,
        stale: false,
        known: true,
      }),
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
  await page.goto('/app/platform/venues/venue-1/specs')
  await page.getByRole('button', { name: 'Mark verified for Guest capacity' }).click()
  await expect(page.getByRole('cell', { name: 'verified', exact: true })).toBeVisible()
  expect(verified).toBe(true)
})

test('shows the neutral disabled state for venue specs', async ({ page }) => {
  await page.route('**/api/admin/**', async (route) =>
    route.fulfill({
      status: 200,
      headers: corsHeaders,
      contentType: 'application/json',
      body: '{}',
    }),
  )
  await page.route('**/api/admin/venues/venue-1/specs', (route) =>
    route.fulfill({
      status: 412,
      headers: corsHeaders,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'feature disabled' }),
    }),
  )
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
  await page.goto('/app/platform/venues/venue-1/specs')
  await expect(page.getByRole('status')).toHaveText(
    'Event planning is not enabled for this organization.',
  )
})
