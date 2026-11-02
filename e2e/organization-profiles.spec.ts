import { expect, test } from '@playwright/test'

test.use({ trace: 'off' })

const corsHeaders = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, PUT, PATCH, OPTIONS', 'access-control-allow-headers': 'content-type, authorization, idempotency-key' }
const orgId = 'c0a80101-0000-4000-8000-000000000002'
const vendorId = 'c0a80101-0000-4000-8000-000000000010'

test('manages sibling organization profiles and profile-scoped regional areas with read-only stats', async ({ page }) => {
  let profileCreate: Record<string, unknown> | undefined
  let areasReplacement: Record<string, unknown> | undefined
  const profile = { id: vendorId, accountId: 'c0a80101-0000-4000-8000-000000000001', businessName: 'Accra Catering', status: 'pending_approval', category: 'catering', profileStats: { ratingCount: 4, averageRating: 4.5, completedBookingCount: 7 } }
  let sibling: typeof profile | undefined
  await page.route('**/api/admin/**', async (route) => route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: '{}' }))
  await page.route(`**/api/admin/organizations/${orgId}`, async (route) => route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ id: orgId, name: 'Accra Events', ownerId: 'c0a80101-0000-4000-8000-000000000001', capabilities: [{ capability: 'vend', status: 'active', kybStatus: 'approved' }] }) }))
  await page.route('**/api/admin/vendors**', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ vendors: sibling ? [profile, sibling] : [profile], total: sibling ? 2 : 1 }) })
    profileCreate = route.request().postDataJSON()
    sibling = { ...profile, id: 'c0a80101-0000-4000-8000-000000000011', businessName: 'Second Caterer' }
    return route.fulfill({ status: 201, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(sibling) })
  })
  await page.route(`**/api/admin/organizations/${orgId}/vendor-profiles/*/service-areas`, async (route) => {
    if (route.request().method() === 'PUT') { areasReplacement = route.request().postDataJSON(); return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ serviceAreas: [] }) }) }
    return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ serviceAreas: [{ id: 'c0a80101-0000-4000-8000-000000000020', vendorId, countryCode: 'GH', regionCode: 'Greater Accra', locality: 'Accra' }] }) })
  })
  await page.addInitScript(() => sessionStorage.setItem('event-os-admin-session', JSON.stringify({ token: 'admin-test-token', tokenType: 'Bearer' })))
  await page.goto(`/app/accounts/organizations/${orgId}`)
  await expect(page.getByText('Vendor profiles', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Accra Catering/ }).click()
  await expect(page.getByText('4.5 rating · 4 reviews · 7 completed bookings')).toBeVisible()
  await page.getByLabel('Contact user UUID').fill(profile.accountId)
  await page.getByLabel('Business name').fill('Second Caterer')
  await page.getByRole('button', { name: 'Create profile' }).click()
  await expect(page.getByRole('button', { name: /Second Caterer/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Second Caterer service areas' })).toBeVisible()
  await page.getByLabel('Regional service areas').fill('NG, Lagos, Lagos')
  await page.getByRole('button', { name: 'Replace service areas' }).click()
  await expect(page.getByRole('status')).toContainText('Service areas saved')
  expect(profileCreate).toMatchObject({ accountId: profile.accountId, managingOrgId: orgId, businessName: 'Second Caterer' })
  expect(areasReplacement).toEqual({ serviceAreas: [{ countryCode: 'NG', regionCode: 'Lagos', locality: 'Lagos' }] })
})
