import { expect, test } from '@playwright/test'

test.use({ trace: 'off' })

const corsHeaders = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS', 'access-control-allow-headers': 'content-type, authorization' }
const orgId = 'c0a80101-0000-4000-8000-000000000002'
const eventId = 'c0a80101-0000-4000-8000-000000000030'
const calloutId = 'c0a80101-0000-4000-8000-000000000031'

test('creates, edits and cancels an organization event callout', async ({ page }) => {
  let createBody: Record<string, unknown> | undefined
  let updateBody: Record<string, unknown> | undefined
  let cancelPath = ''
  let callouts: Array<Record<string, unknown>> = []
  await page.route('**/api/admin/**', async (route) => route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: '{}' }))
  await page.route(`**/api/admin/organizations/${orgId}`, async (route) => route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ id: orgId, name: 'Accra Events', ownerId: 'c0a80101-0000-4000-8000-000000000001', capabilities: [{ capability: 'organize', status: 'active', kybStatus: 'approved' }] }) }))
  await page.route(`**/api/admin/events?orgId=${orgId}`, async (route) => route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ events: [{ id: eventId, title: 'Spring Gala', orgId }] }) }))
  await page.route('**/api/admin/vendor-callouts?*', async (route) => route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ callouts, total: callouts.length }) }))
  await page.route(`**/api/admin/organizations/${orgId}/events/${eventId}/vendor-callouts`, async (route) => {
    if (route.request().method() === 'POST') {
      createBody = route.request().postDataJSON()
      const payload = createBody as Record<string, unknown>
      callouts = [{ id: calloutId, orgId, eventId, ...payload, status: 'open' }]
      return route.fulfill({ status: 201, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(callouts[0]) })
    }
    return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: '{}' })
  })
  await page.route(`**/api/admin/organizations/${orgId}/events/${eventId}/vendor-callouts/${calloutId}`, async (route) => {
    updateBody = route.request().postDataJSON()
    callouts = [{ ...callouts[0], ...(updateBody as Record<string, unknown>) }]
    await route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(callouts[0]) })
  })
  await page.route(`**/api/admin/vendor-callouts/${calloutId}/cancel`, async (route) => {
    cancelPath = new URL(route.request().url()).pathname
    callouts = [{ ...callouts[0], status: 'cancelled' }]
    await route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(callouts[0]) })
  })
  await page.addInitScript(() => sessionStorage.setItem('event-os-admin-session', JSON.stringify({ token: 'admin-test-token', tokenType: 'Bearer' })))
  await page.goto(`/app/accounts/organizations/${orgId}`)
  await expect(page.getByText('Organization vendor callouts')).toBeVisible()
  await page.getByLabel('Organization event').selectOption(eventId)
  await page.getByLabel('Category').fill('festival')
  await page.getByLabel('Service kinds').fill('wristbands, ticket_printing')
  await page.getByLabel('Opens at').fill('2030-05-01T09:00')
  await page.getByLabel('Closes at').fill('2030-05-02T18:00')
  await page.getByRole('button', { name: 'Create callout' }).click()
  await expect(page.getByText('festival', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Edit' }).click()
  await page.getByLabel('Category').fill('conference')
  await page.getByRole('button', { name: 'Save callout' }).click()
  await expect(page.getByText('conference', { exact: true })).toBeVisible()
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Cancel' }).click()
  expect(createBody).toMatchObject({ category: 'festival', serviceKinds: ['wristbands', 'ticket_printing'] })
  expect(updateBody).toMatchObject({ category: 'conference', serviceKinds: ['wristbands', 'ticket_printing'] })
  expect(cancelPath).toBe(`/api/admin/vendor-callouts/${calloutId}/cancel`)
})
