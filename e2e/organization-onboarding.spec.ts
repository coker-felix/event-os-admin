import { expect, test } from '@playwright/test'

const corsHeaders = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type, authorization, idempotency-key' }

test('creates a user then creates a capability-based organization with a replay key', async ({ page }) => {
  const owner = { id: 'c0a80101-0000-4000-8000-000000000001', name: 'Taylor Owner', email: 'taylor@example.test', status: 'active' }
  let createUserBody: Record<string, unknown> | undefined
  let createOrgBody: Record<string, unknown> | undefined
  let createOrgKey = ''
  let createUserAttempts = 0
  let createOrgAttempts = 0
  let capabilityAttempts = 0
  let capabilityAddBody: Record<string, unknown> | undefined
  const userKeys: string[] = []
  const organizationKeys: string[] = []
  const capabilityKeys: string[] = []

  await page.route('**/api/admin/**', async (route) => route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: '{}' }))
  await page.route('**/api/admin/login', async (route) => route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ token: 'admin-test-token' }) }))
  await page.route('**/api/admin/users', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ users: [owner] }) })
    createUserBody = route.request().postDataJSON()
    userKeys.push(route.request().headers()['idempotency-key'] || '')
    createUserAttempts += 1
    if (createUserAttempts === 1) return route.fulfill({ status: 503, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ error: 'Temporary failure' }) })
    return route.fulfill({ status: 201, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ id: owner.id }) })
  })
  await page.route('**/api/admin/organizations', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ organizations: [] }) })
    createOrgBody = route.request().postDataJSON()
    createOrgKey = route.request().headers()['idempotency-key'] || ''
    organizationKeys.push(createOrgKey)
    createOrgAttempts += 1
    if (createOrgAttempts === 1) return route.fulfill({ status: 503, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ error: 'Temporary failure' }) })
    return route.fulfill({ status: 201, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ id: 'c0a80101-0000-4000-8000-000000000002' }) })
  })
  await page.route('**/api/admin/organizations/c0a80101-0000-4000-8000-000000000002', async (route) => route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ id: 'c0a80101-0000-4000-8000-000000000002', name: 'Taylor Events', capabilities: [{ capability: 'organize', status: 'pending', kybStatus: 'pending' }, { capability: 'vend', status: 'pending', kybStatus: 'pending' }] }) }))
  await page.route('**/api/admin/organizations/c0a80101-0000-4000-8000-000000000002/capabilities', async (route) => {
    capabilityAddBody = route.request().postDataJSON()
    capabilityKeys.push(route.request().headers()['idempotency-key'] || '')
    capabilityAttempts += 1
    if (capabilityAttempts === 1) return route.fulfill({ status: 503, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ error: 'Temporary capability failure' }) })
    return route.fulfill({ status: 201, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ capability: { capability: 'host', status: 'pending', kybStatus: 'pending' } }) })
  })

  await page.goto('/signin')
  await page.evaluate(() => sessionStorage.setItem('event-os-admin-session', JSON.stringify({ token: 'admin-test-token', tokenType: 'Bearer' })))
  await page.goto('/app/accounts/users')
  await page.getByRole('button', { name: 'Add user' }).click()
  await page.getByLabel('Full name').fill('Taylor Owner')
  await page.getByLabel(/Email/).fill('taylor@example.test')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('alert')).toContainText('Temporary failure')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page).toHaveURL(/\/app\/accounts\/organizations\/new\?ownerId=/)
  await expect(page.getByLabel('Owner account')).toHaveValue(owner.id)
  await page.getByLabel('Organization name').fill('Taylor Events')
  await page.getByLabel('Provide vendor services').check()
  await page.getByRole('button', { name: 'Create organization' }).click()
  await expect(page.getByRole('alert')).toContainText('Temporary failure')
  await page.getByRole('button', { name: 'Create organization' }).click()
  await expect(page).toHaveURL(/\/app\/accounts\/organizations\/c0a80101-0000-4000-8000-000000000002$/)
  await expect(page.getByText('organize', { exact: true })).toBeVisible()
  await page.getByLabel('Add capability').selectOption('host')
  await page.getByLabel('Reason', { exact: true }).fill('Venue operations capability')
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByRole('alert')).toContainText('Temporary capability failure')
  await page.getByRole('button', { name: 'Add' }).click()
  await expect.poll(() => capabilityKeys).toHaveLength(2)

  expect(createUserBody).toMatchObject({ name: 'Taylor Owner', email: 'taylor@example.test' })
  expect(createUserBody?.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i)
  expect(userKeys).toHaveLength(2)
  expect(userKeys[0]).toBe(userKeys[1])
  expect(createOrgBody).toMatchObject({ ownerId: owner.id, name: 'Taylor Events', capabilities: ['organize', 'vend'] })
  expect(createOrgBody?.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i)
  expect(createOrgKey).toBe(createOrgBody?.idempotencyKey)
  expect(organizationKeys).toHaveLength(2)
  expect(organizationKeys[0]).toBe(organizationKeys[1])
  expect(capabilityAddBody).toMatchObject({ capability: 'host', reason: 'Venue operations capability' })
  expect(capabilityAddBody?.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i)
  expect(capabilityKeys).toHaveLength(2)
  expect(capabilityKeys[0]).toMatch(/^[0-9a-f-]{36}$/i)
  expect(capabilityKeys[0]).toBe(capabilityKeys[1])
})
