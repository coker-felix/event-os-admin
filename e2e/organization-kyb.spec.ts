import { expect, test } from '@playwright/test'

test.use({ trace: 'off' })

const corsHeaders = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, PUT, PATCH, OPTIONS', 'access-control-allow-headers': 'content-type, authorization, idempotency-key' }
const organizationId = 'c0a80101-0000-4000-8000-000000000002'
const artifactId = 'c0a80101-0000-4000-8000-000000000003'

test('uploads organization KYB evidence, waits for a clean scan, then submits with a replay key', async ({ page }) => {
  let uploadRequest: Record<string, unknown> | undefined
  let submission: Record<string, unknown> | undefined
  let submissionKey = ''
  const submissionKeys: string[] = []
  let submissionAttempts = 0
  await page.route('**/api/admin/**', async (route) => route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: '{}' }))
  await page.route('**/api/admin/login', async (route) => route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ token: 'admin-test-token' }) }))
  await page.route(`**/api/admin/organizations/${organizationId}`, async (route) => route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ id: organizationId, name: 'Taylor Events', ownerId: 'c0a80101-0000-4000-8000-000000000001', capabilities: [{ capability: 'vend', status: 'pending', kybStatus: 'pending' }] }) }))
  await page.route(`**/api/admin/organizations/${organizationId}/kyb-evidence/uploads`, async (route) => {
    uploadRequest = route.request().postDataJSON()
    await route.fulfill({ status: 201, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ artifactId, uploadUrl: 'http://127.0.0.1:5173/mock-kyb-upload', method: 'PUT', headers: { 'Content-Type': 'application/pdf', 'Content-Length': '13' }, expiresAt: new Date(Date.now() + 300000).toISOString(), scanStatus: 'pending' }) })
  })
  await page.route('**/mock-kyb-upload', async (route) => route.fulfill({ status: 200, headers: corsHeaders }))
  await page.route(`**/api/admin/organizations/${organizationId}/kyb-evidence/${artifactId}/complete`, async (route) => route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ artifactId, kind: 'business_registration', scanStatus: 'pending' }) }))
  await page.route(`**/api/admin/organizations/${organizationId}/kyb-evidence/${artifactId}?capability=vend`, async (route) => route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ artifactId, kind: 'business_registration', scanStatus: 'clean' }) }))
  await page.route(`**/api/admin/organizations/${organizationId}/capabilities/vend/kyb`, async (route) => {
    submission = route.request().postDataJSON()
    submissionKey = route.request().headers()['idempotency-key'] || ''
    submissionKeys.push(submissionKey)
    submissionAttempts += 1
    if (submissionAttempts === 1) return route.fulfill({ status: 503, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ error: 'Temporary KYB failure' }) })
    await route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ orgId: organizationId, capability: 'vend', status: 'under_review' }) })
  })

  await page.addInitScript(() => sessionStorage.setItem('event-os-admin-session', JSON.stringify({ token: 'admin-test-token', tokenType: 'Bearer' })))
  await page.goto(`/app/accounts/organizations/${organizationId}`)
  await expect(page.getByRole('heading', { name: 'Taylor Events' })).toBeVisible()
  await page.getByLabel('KYB capability').selectOption('vend')
  await page.getByLabel(/Document \(PDF/).setInputFiles({ name: 'registration.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7 test') })
  await page.getByRole('button', { name: 'Upload evidence' }).click()
  await expect(page.getByText('Scan: clean')).toBeVisible()
  await page.getByRole('button', { name: 'Submit 1 clean document' }).click()
  await expect(page.getByRole('alert')).toContainText('Temporary KYB failure')
  await page.getByRole('button', { name: 'Submit 1 clean document' }).click()
  await expect(page.getByRole('status')).toContainText('KYB submitted')

  expect(uploadRequest).toMatchObject({ capability: 'vend', kind: 'business_registration', contentType: 'application/pdf', sizeBytes: 13 })
  expect(uploadRequest?.sha256).toMatch(/^[0-9a-f]{64}$/)
  expect(submission).toMatchObject({ documents: [{ kind: 'business_registration', artifactId }] })
  expect(submission?.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i)
  expect(submissionKey).toBe(submission?.idempotencyKey)
  expect(submissionKeys).toHaveLength(2)
  expect(submissionKeys[0]).toMatch(/^[0-9a-f-]{36}$/i)
  expect(submissionKeys[0]).toBe(submissionKeys[1])
})
