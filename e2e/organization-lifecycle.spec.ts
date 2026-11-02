import { expect, test } from '@playwright/test'

test.use({ trace: 'off' })

const corsHeaders = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, PATCH, OPTIONS', 'access-control-allow-headers': 'content-type, authorization' }
const orgId = 'c0a80101-0000-4000-8000-000000000002'

test('edits and suspends an organization and suspends an approved capability', async ({ page }) => {
  let organization: Record<string, unknown> = { id: orgId, name: 'Taylor Events', email: 'old@example.test', phone: '+233200000000', address: 'Accra', status: 'active', ownerId: 'c0a80101-0000-4000-8000-000000000001', capabilities: [{ capability: 'organize', status: 'active', kybStatus: 'approved' }] }
  let editBody: Record<string, unknown> | undefined
  let orgStatusBody: Record<string, unknown> | undefined
  let capabilityStatusBody: Record<string, unknown> | undefined
  await page.route('**/api/admin/**', async (route) => route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: '{}' }))
  await page.route(`**/api/admin/organizations/${orgId}`, async (route) => {
    if (route.request().method() === 'PATCH') {
      editBody = route.request().postDataJSON()
      organization = { ...organization, ...editBody }
    }
    return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(organization) })
  })
  await page.route(`**/api/admin/organizations/${orgId}/status`, async (route) => {
    orgStatusBody = route.request().postDataJSON()
    organization = { ...organization, ...orgStatusBody }
    await route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(organization) })
  })
  await page.route(`**/api/admin/organizations/${orgId}/capabilities/organize/status`, async (route) => {
    capabilityStatusBody = route.request().postDataJSON()
    const capabilities = organization.capabilities as Array<Record<string, unknown>>
    organization = { ...organization, capabilities: capabilities.map((item) => ({ ...item, status: capabilityStatusBody?.status })) }
    await route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({}) })
  })
  await page.addInitScript(() => sessionStorage.setItem('event-os-admin-session', JSON.stringify({ token: 'admin-test-token', tokenType: 'Bearer' })))
  await page.goto(`/app/accounts/organizations/${orgId}`)
  await page.getByLabel('Organization name').fill('Taylor Events Group')
  await page.getByLabel('Email', { exact: true }).fill('ops@example.test')
  await page.getByLabel('Reason for edit').fill('Updated verified contacts')
  await page.getByRole('button', { name: 'Save organization' }).click()
  await expect.poll(() => editBody).toMatchObject({ name: 'Taylor Events Group', email: 'ops@example.test', reason: 'Updated verified contacts' })

  page.on('dialog', (dialog) => dialog.accept('Compliance review'))
  await page.getByRole('button', { name: 'Suspend organization' }).click()
  await expect.poll(() => orgStatusBody).toEqual({ status: 'suspended', reason: 'Compliance review' })
  await page.getByLabel('Suspension reason').fill('Capability review')
  await page.getByRole('button', { name: 'Suspend capability' }).click()
  await expect.poll(() => capabilityStatusBody).toEqual({ status: 'suspended', reason: 'Capability review' })
})
