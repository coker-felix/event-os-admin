import { expect, test } from '@playwright/test'

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization',
}
const orgId = 'c0a80101-0000-4000-8000-000000000002'
const pendingVendorOrgId = 'c0a80101-0000-4000-8000-000000000004'
const activeVendorId = 'c0a80101-0000-4000-8000-000000000010'
const suspendedVendorId = 'c0a80101-0000-4000-8000-000000000011'

test('admin lists, filters, edits, suspends, and creates vendor profiles', async ({ page }) => {
  let profiles: Array<Record<string, unknown>> = [
    { id: activeVendorId, accountId: 'c0a80101-0000-4000-8000-000000000001', managingOrgId: orgId, businessName: 'Accra Catering', contactName: 'Ama Mensah', email: 'ama@example.com', phone: '+233200000001', category: 'catering', city: 'Accra', country: 'GH', description: 'Event catering', status: 'active', tier: 'normal' },
    { id: suspendedVendorId, accountId: 'c0a80101-0000-4000-8000-000000000003', managingOrgId: orgId, businessName: 'North Star Sound', email: 'sound@example.com', phone: '+233200000003', category: 'audio', city: 'Tamale', country: 'GH', status: 'suspended', tier: 'verified' },
  ]
  let updateBody: Record<string, unknown> | undefined
  let statusBody: Record<string, unknown> | undefined
  let createBody: Record<string, unknown> | undefined

  await page.route('**/api/admin/**', async (route) => route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: '{}' }))
  await page.route('**/api/admin/vendors**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (request.method() === 'GET' && url.pathname === '/api/admin/vendors') {
      return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ vendors: profiles, total: profiles.length }) })
    }
    if (request.method() === 'PATCH' && url.pathname.endsWith('/status')) {
      statusBody = request.postDataJSON()
      const id = url.pathname.split('/').at(-2)
      profiles = profiles.map((profile) => profile.id === id ? { ...profile, status: statusBody?.status } : profile)
      return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(profiles.find((profile) => profile.id === id)) })
    }
    if (request.method() === 'PATCH') {
      updateBody = request.postDataJSON()
      const id = url.pathname.split('/').at(-1)
      profiles = profiles.map((profile) => profile.id === id ? { ...profile, ...updateBody } : profile)
      return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(profiles.find((profile) => profile.id === id)) })
    }
    if (request.method() === 'POST') {
      createBody = request.postDataJSON()
      const created = { id: 'c0a80101-0000-4000-8000-000000000012', ...createBody, status: 'pending_approval', tier: 'normal' }
      profiles = [...profiles, created]
      return route.fulfill({ status: 201, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(created) })
    }
    return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: '{}' })
  })
  await page.route('**/api/admin/organizations?capability=vend', async (route) => route.fulfill({
    status: 200, headers: corsHeaders, contentType: 'application/json',
    body: JSON.stringify({ organizations: [
      { id: orgId, name: 'Accra Events', ownerId: 'c0a80101-0000-4000-8000-000000000001', email: 'owner@example.com', status: 'active', capabilities: [{ capability: 'vend', status: 'active', kybStatus: 'approved' }] },
      { id: pendingVendorOrgId, name: 'Pending Vendor Org', ownerId: 'c0a80101-0000-4000-8000-000000000004', email: 'pending@example.com', status: 'active', capabilities: [{ capability: 'vend', status: 'pending', kybStatus: 'pending' }] },
    ] }),
  }))
  await page.route('**/api/admin/countries', async (route) => route.fulfill({
    status: 200, headers: corsHeaders, contentType: 'application/json',
    body: JSON.stringify({ countries: [{ code: 'GH', name: 'Ghana', enabled: true }] }),
  }))
  await page.addInitScript(() => sessionStorage.setItem('event-os-admin-session', JSON.stringify({ token: 'admin-test-token', tokenType: 'Bearer' })))

  await page.goto('/app/accounts/vendors')
  await expect(page.getByRole('heading', { name: 'Vendor Profiles' })).toBeVisible()
  await expect(page.getByText('Accra Catering')).toBeVisible()
  await expect(page.getByText('North Star Sound')).toBeVisible()

  await page.getByLabel('Filter vendor profiles by status').selectOption('suspended')
  await expect(page.getByText('North Star Sound')).toBeVisible()
  await expect(page.getByText('Accra Catering')).toHaveCount(0)
  await page.getByLabel('Filter vendor profiles by status').selectOption('all')

  await page.getByRole('button', { name: 'Edit profile for Accra Catering' }).click()
  await page.getByLabel('Business name', { exact: true }).fill('Accra Catering Co.')
  await page.getByLabel('Description', { exact: true }).fill('Updated profile description')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Accra Catering Co.')).toBeVisible()
  expect(updateBody).toMatchObject({ managingOrgId: orgId, businessName: 'Accra Catering Co.', description: 'Updated profile description' })

  await page.getByRole('button', { name: 'Change status for Accra Catering Co.' }).click()
  await page.getByLabel('New status').selectOption('suspended')
  await page.getByRole('button', { name: 'Update status' }).click()
  await expect(page.getByRole('row').filter({ hasText: 'Accra Catering Co.' })).toContainText('Suspended')
  expect(statusBody).toEqual({ status: 'suspended' })

  await page.getByRole('button', { name: 'Add vendor profile' }).click()
  const managingOrgSelect = page.locator('#create-admin-vendor select').first()
  await expect(managingOrgSelect.locator(`option[value="${pendingVendorOrgId}"]`)).toHaveCount(0)
  await managingOrgSelect.selectOption(orgId)
  await page.getByLabel('Business name', { exact: true }).fill('Kumasi Rentals')
  await page.getByLabel('Email', { exact: true }).fill('hello@kumasirentals.example')
  await page.getByLabel('Country', { exact: true }).selectOption('GH')
  await page.getByLabel('Description (optional)').fill('Equipment rentals for events')
  await page.getByRole('button', { name: 'Create vendor' }).click()
  await expect(page.getByText('Vendor profile created and pending approval')).toBeVisible()
  expect(createBody).toMatchObject({ managingOrgId: orgId, businessName: 'Kumasi Rentals', description: 'Equipment rentals for events' })
})
