import { expect, test } from '@playwright/test'

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, PUT, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization',
}

test('adds calendar holidays and reports invalid dates and weekend configuration', async ({
  page,
}) => {
  await page.route('**/api/admin/**', async (route) =>
    route.fulfill({
      status: 200,
      headers: corsHeaders,
      contentType: 'application/json',
      body: '{}',
    }),
  )
  let saved: Record<string, unknown> | null = null
  await page.route('**/api/admin/calendar-rules**', async (route) => {
    if (route.request().method() === 'GET')
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ rules: saved ? [saved] : [] }),
      })
    saved = route.request().postDataJSON()
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
  await page.goto('/app/platform/calendar-rules')
  await page.getByRole('button', { name: 'New rule' }).click()
  await page.getByLabel('Country code').fill('GH')
  for (const day of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
    await page.getByLabel(day, { exact: true }).check()
  await page.getByLabel('Holiday name').fill('Republic Day')
  await page.getByRole('button', { name: 'Add holiday' }).click()
  await expect(page.getByRole('alert')).toContainText('valid calendar dates')
  await page.getByLabel('Holiday date').click()
  await page.getByRole('gridcell').first().click()
  await page.getByRole('button', { name: 'Add holiday' }).click()
  await page.getByRole('button', { name: 'Save calendar rule' }).click()
  await expect(page.getByRole('alert')).toContainText('all seven days')
  await page.getByLabel('Sat', { exact: true }).uncheck()
  await page.getByLabel('Holiday date').click()
  await page.getByRole('gridcell').first().click()
  await page.getByLabel('Holiday name').fill('Duplicate holiday')
  await page.getByRole('button', { name: 'Add holiday' }).click()
  await expect(page.getByRole('alert')).toContainText('unique')
  await page.getByLabel('Holiday date').click()
  await page.getByRole('gridcell').nth(1).click()
  await page.getByLabel('Holiday name').fill('Founders Day')
  await page.getByRole('button', { name: 'Add holiday' }).click()
  await page.getByRole('button', { name: 'Save calendar rule' }).click()
  await expect(page.getByRole('cell', { name: 'GH', exact: true })).toBeVisible()
  expect(saved).toMatchObject({
    countryCode: 'GH',
    holidays: [{ name: 'Republic Day' }, { name: 'Founders Day' }],
  })
})
