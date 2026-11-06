import { expect, test } from '@playwright/test'

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, PUT, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization',
}

test('creates, edits, and validates staffing rules with mocked admin API', async ({ page }) => {
  await page.route('**/api/admin/**', async (route) =>
    route.fulfill({
      status: 200,
      headers: corsHeaders,
      contentType: 'application/json',
      body: '{}',
    }),
  )
  let rules = [
    {
      id: 'rule-1',
      role: 'waiter',
      eventType: 'casual',
      serviceStyle: 'buffet',
      guestsPerStaff: 10,
      minStaff: 2,
      active: true,
    },
  ]
  await page.route('**/api/admin/staffing-rules**', async (route) => {
    const request = route.request()
    if (request.method() === 'GET')
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ rules }),
      })
    const body = request.postDataJSON()
    if (body.guestsPerStaff === 13)
      return route.fulfill({
        status: 400,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server rejected this staffing ratio.' }),
      })
    const saved = { id: 'rule-1', ...body }
    rules = [saved]
    return route.fulfill({
      status: 200,
      headers: corsHeaders,
      contentType: 'application/json',
      body: JSON.stringify(saved),
    })
  })
  await page.addInitScript(() =>
    sessionStorage.setItem(
      'event-os-admin-session',
      JSON.stringify({ token: 'admin-test-token', tokenType: 'Bearer' }),
    ),
  )
  await page.goto('/app/platform/staffing-rules')
  await expect(page.getByRole('heading', { name: 'Staffing rules' })).toBeVisible()
  await page.getByRole('button', { name: 'Edit rule for waiter, casual, buffet' }).click()
  await page.getByLabel('Guests per staff').fill('20')
  await page.getByRole('button', { name: 'Save rule' }).click()
  await expect(page.getByRole('cell', { name: '20', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Add rule' }).click()
  await page.getByLabel('Guests per staff').fill('0')
  await page.getByRole('button', { name: 'Save rule' }).click()
  await expect(page.getByRole('alert')).toContainText('integer ≥ 1')
  await page.getByLabel('Guests per staff').fill('13')
  await page.getByRole('button', { name: 'Save rule' }).click()
  await expect(page.getByRole('alert')).toContainText('Server rejected this staffing ratio.')
  await page.getByLabel('Guests per staff').fill('12')
  await page.getByRole('button', { name: 'Save rule' }).click()
  await expect(page.getByRole('cell', { name: '12', exact: true })).toBeVisible()
})
