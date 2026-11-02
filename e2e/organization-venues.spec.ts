import { expect, test } from '@playwright/test'

test.use({ trace: 'off' })

const corsHeaders = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, PUT, PATCH, OPTIONS', 'access-control-allow-headers': 'content-type, authorization' }
const orgId = 'c0a80101-0000-4000-8000-000000000002'

test('creates, edits, and archives organization-managed venues', async ({ page }) => {
  let venues: Array<{ id: string; managingOrgId: string; name: string; city: string; capacity: number; status: string; createdVia: string }> = []
  let archiveBody: Record<string, unknown> | undefined
  await page.route('**/api/admin/**', async (route) => route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: '{}' }))
  await page.route(`**/api/admin/organizations/${orgId}`, async (route) => route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ id: orgId, name: 'Accra Events', ownerId: 'c0a80101-0000-4000-8000-000000000001', capabilities: [{ capability: 'host', status: 'active', kybStatus: 'approved' }] }) }))
  await page.route('**/api/admin/venues**', async (route) => route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ venues }) }))
  await page.route(`**/api/admin/organizations/${orgId}/venues`, async (route) => {
    const body = route.request().postDataJSON()
    const created = { ...body, id: 'c0a80101-0000-4000-8000-000000000030', managingOrgId: orgId, status: 'pending_approval', createdVia: 'organization_managed' }
    venues = [created]
    await route.fulfill({ status: 201, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(created) })
  })
  await page.route(`**/api/admin/organizations/${orgId}/venues/*`, async (route) => {
    const body = route.request().postDataJSON()
    venues = venues.map((venue) => ({ ...venue, ...body }))
    return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(venues[0]) })
  })
  await page.route(`**/api/admin/organizations/${orgId}/venues/*/archive`, async (route) => {
    archiveBody = route.request().postDataJSON()
    venues = venues.map((venue) => ({ ...venue, status: 'archived' }))
    await route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(venues[0]) })
  })
  await page.addInitScript(() => sessionStorage.setItem('event-os-admin-session', JSON.stringify({ token: 'admin-test-token', tokenType: 'Bearer' })))
  await page.goto(`/app/accounts/organizations/${orgId}`)
  await expect(page.getByText('Organization venues', { exact: true })).toBeVisible()
  await page.getByLabel('Venue name').fill('Harbor Hall')
  await page.getByLabel('Capacity').fill('500')
  await page.getByLabel('City', { exact: true }).fill('Accra')
  await page.getByRole('button', { name: 'Create venue' }).click()
  await expect(page.getByText('Harbor Hall', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Edit' }).click()
  await page.getByLabel('Venue name').fill('Harbor Hall Annex')
  await page.getByRole('button', { name: 'Save venue' }).click()
  await expect(page.getByText('Harbor Hall Annex', { exact: true })).toBeVisible()
  page.on('dialog', (dialog) => dialog.accept('Venue closed'))
  await page.getByRole('button', { name: 'Archive' }).click()
  await expect(page.getByText(/Accra · archived · organization_managed/)).toBeVisible()
  expect(venues[0]).toMatchObject({ managingOrgId: orgId, createdVia: 'organization_managed', status: 'archived' })
  expect(archiveBody).toEqual({ reason: 'Venue closed' })
})
