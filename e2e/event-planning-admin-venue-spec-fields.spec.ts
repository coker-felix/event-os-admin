import { expect, test } from '@playwright/test'

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, PUT, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization',
}

test('creates and edits venue spec fields with immutable codes', async ({ page }) => {
  await page.route('**/api/admin/**', async (route) =>
    route.fulfill({
      status: 200,
      headers: corsHeaders,
      contentType: 'application/json',
      body: '{}',
    }),
  )
  let fields: Array<Record<string, unknown>> = []
  await page.route('**/api/admin/venue-spec-fields**', async (route) => {
    if (route.request().method() === 'GET')
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ fields }),
      })
    const body = route.request().postDataJSON()
    const code = new URL(route.request().url()).pathname.split('/').at(-1)!
    const saved = { code, ...body }
    fields = [saved]
    return route.fulfill({
      status: 200,
      headers: corsHeaders,
      contentType: 'application/json',
      body: JSON.stringify(saved),
    })
  })
  await page.route('**/api/admin/venue-types', (route) =>
    route.fulfill({
      status: 200,
      headers: corsHeaders,
      contentType: 'application/json',
      body: JSON.stringify({ types: [{ code: 'banquet_hall', label: 'Banquet hall' }] }),
    }),
  )
  await page.addInitScript(() =>
    sessionStorage.setItem(
      'event-os-admin-session',
      JSON.stringify({ token: 'admin-test-token', tokenType: 'Bearer' }),
    ),
  )
  await page.goto('/app/platform/venue-spec-fields')
  await page.getByRole('button', { name: 'New field' }).click()
  await page.getByLabel('Code', { exact: true }).fill('ceiling_height')
  await page.getByLabel('Label', { exact: true }).fill('Ceiling height')
  await page.getByLabel('Value type', { exact: true }).selectOption('enum')
  await page.getByRole('button', { name: 'Save field' }).click()
  await expect(page.getByRole('alert')).toContainText('Enum values are required')
  await page.getByLabel('Enum values (comma separated)').fill('low,standard,high')
  await page.getByLabel('Banquet hall', { exact: true }).check()
  await page.getByRole('button', { name: 'Save field' }).click()
  await page.getByRole('button', { name: 'Edit field Ceiling height' }).click()
  await expect(page.getByLabel('Code', { exact: true })).toHaveValue('ceiling_height')
  await expect(page.getByLabel('Code', { exact: true })).toBeDisabled()
  await page.getByLabel('Label', { exact: true }).fill('Clearance height')
  await page.getByRole('button', { name: 'Save field' }).click()
  await expect(page.getByRole('cell', { name: 'Clearance height', exact: true })).toBeVisible()
})

test('shows the neutral disabled state when planning is not enabled', async ({ page }) => {
  await page.route('**/api/admin/**', async (route) =>
    route.fulfill({
      status: 200,
      headers: corsHeaders,
      contentType: 'application/json',
      body: '{}',
    }),
  )
  await page.route('**/api/admin/venue-spec-fields**', (route) =>
    route.fulfill({
      status: 412,
      headers: corsHeaders,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'feature disabled' }),
    }),
  )
  await page.route('**/api/admin/venue-types', (route) =>
    route.fulfill({
      status: 412,
      headers: corsHeaders,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'feature disabled' }),
    }),
  )
  await page.addInitScript(() =>
    sessionStorage.setItem(
      'event-os-admin-session',
      JSON.stringify({ token: 'admin-test-token', tokenType: 'Bearer' }),
    ),
  )
  await page.goto('/app/platform/venue-spec-fields')
  await expect(page.getByRole('status')).toHaveText(
    'Event planning is not enabled for this organization.',
  )
})
