import { expect, test } from '@playwright/test'

test.use({ trace: 'off' })

const corsHeaders = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS', 'access-control-allow-headers': 'content-type, authorization' }
const orgId = 'c0a80101-0000-4000-8000-000000000002'
const ownerId = 'c0a80101-0000-4000-8000-000000000001'
const organizerMemberId = 'c0a80101-0000-4000-8000-000000000010'
const vendorMemberId = 'c0a80101-0000-4000-8000-000000000011'

test('manages memberships and invitations independently for each capability scope', async ({ page }) => {
  const members: Record<string, Array<Record<string, unknown>>> = {
    organizer: [
      { id: ownerId, userId: ownerId, name: 'Org Owner', roleId: 'organizer_owner', status: 'active' },
      { id: organizerMemberId, userId: organizerMemberId, name: 'Event Editor', roleId: 'organizer_editor', status: 'active' },
    ],
    vendor: [{ id: vendorMemberId, userId: vendorMemberId, name: 'Vendor Manager', roleId: 'vendor_manager', status: 'active' }],
  }
  const invites: Record<string, Array<Record<string, unknown>>> = { organizer: [], vendor: [] }
  let inviteBody: Record<string, unknown> | undefined
  let roleChange: Record<string, unknown> | undefined
  let statusChange: Record<string, unknown> | undefined
  let removePath = ''
  let revokedPath = ''

  await page.route('**/api/admin/**', async (route) => route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: '{}' }))
  await page.route(`**/api/admin/organizations/${orgId}`, async (route) => route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ id: orgId, name: 'Accra Events', ownerId, capabilities: [{ capability: 'organize', status: 'active', kybStatus: 'approved' }, { capability: 'vend', status: 'active', kybStatus: 'approved' }] }) }))
  await page.route('**/api/admin/roles?scope=*', async (route) => {
    const scope = new URL(route.request().url()).searchParams.get('scope') || 'organizer'
    const roles = scope === 'vendor'
      ? [{ id: 'role-vendor-owner', code: 'vendor_owner', name: 'Vendor owner' }, { id: 'role-vendor-manager', code: 'vendor_manager', name: 'Vendor manager' }, { id: 'role-vendor-assistant', code: 'vendor_assistant', name: 'Vendor assistant' }]
      : [{ id: 'role-organizer-owner', code: 'organizer_owner', name: 'Organizer owner' }, { id: 'role-organizer-editor', code: 'organizer_editor', name: 'Event editor' }]
    await route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ roles }) })
  })
  await page.route(`**/api/admin/organizations/${orgId}/invites**`, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const scope = url.searchParams.get('scope') || 'organizer'
    if (request.method() === 'POST') {
      const path = url.pathname
      revokedPath = path
      const invite = invites[scope].find((item) => item.id === path.split('/').at(-2))
      if (invite) invite.status = 'revoked'
      return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ revoked: true }) })
    }
    return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ invites: invites[scope] }) })
  })
  await page.route(`**/api/admin/organizations/${orgId}/members**`, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const scope = url.searchParams.get('scope') || 'organizer'
    const path = url.pathname
    if (path.endsWith('/members/invites') && request.method() === 'POST') {
      inviteBody = request.postDataJSON()
      const invite = { id: 'invite-vendor-1', orgId, destination: inviteBody.destination, roleId: inviteBody.roleId, scope: inviteBody.scope, status: 'pending' }
      invites[String(inviteBody.scope)].push(invite)
      return route.fulfill({ status: 201, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ inviteId: invite.id }) })
    }
    if (path.endsWith('/role') && request.method() === 'PATCH') {
      roleChange = request.postDataJSON()
      const member = members[String(roleChange.scope)].find((item) => item.userId === path.split('/').at(-2))
      if (member) member.roleId = roleChange.roleId
      return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: '{}' })
    }
    if (path.endsWith('/status') && request.method() === 'PATCH') {
      statusChange = request.postDataJSON()
      const member = members[String(statusChange.scope)].find((item) => item.userId === path.split('/').at(-2))
      if (member) member.status = statusChange.status
      return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: '{}' })
    }
    if (path.endsWith('/revoke') && request.method() === 'POST') {
      revokedPath = path
      const invite = invites[scope].find((item) => item.id === path.split('/').at(-2))
      if (invite) invite.status = 'revoked'
      return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ revoked: true }) })
    }
    if (path.includes('/members/') && request.method() === 'DELETE') {
      removePath = path
      const payload = request.postDataJSON() as { scope: string }
      const userId = path.split('/').at(-1)
      members[payload.scope] = members[payload.scope].filter((item) => item.userId !== userId)
      return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: '{}' })
    }
    if (path.endsWith('/invites')) return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ invites: invites[scope] }) })
    return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ members: members[scope] }) })
  })

  await page.addInitScript(() => sessionStorage.setItem('event-os-admin-session', JSON.stringify({ token: 'admin-test-token', tokenType: 'Bearer' })))
  await page.goto(`/app/accounts/organizations/${orgId}`)
  await expect(page.getByText('Members · organizer')).toBeVisible()
  await expect(page.getByText('Org Owner · Owner')).toBeVisible()
  await expect(page.getByLabel('Role for Org Owner')).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Suspend', exact: true })).toHaveCount(1)
  await page.getByLabel('Membership scope').selectOption('vendor')
  await expect(page.getByText('Members · vendor')).toBeVisible()
  await expect(page.getByText('Vendor Manager', { exact: true })).toBeVisible()
  await page.getByLabel('Role for Vendor Manager').selectOption('vendor_assistant')
  await expect.poll(() => roleChange).toMatchObject({ roleId: 'vendor_assistant', scope: 'vendor' })
  await page.getByRole('button', { name: 'Suspend', exact: true }).click()
  await expect.poll(() => statusChange).toMatchObject({ status: 'suspended', scope: 'vendor' })
  await page.getByLabel('Phone number').fill('+233200000002')
  await page.getByLabel('Invite role').selectOption('vendor_manager')
  await page.getByRole('button', { name: 'Send invite' }).click()
  await expect(page.getByText('+233200000002')).toBeVisible()
  await page.getByRole('button', { name: 'Revoke' }).click()
  await expect.poll(() => revokedPath).toBe(`/api/admin/organizations/${orgId}/invites/invite-vendor-1/revoke`)
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Remove' }).click()
  await expect.poll(() => removePath).toBe(`/api/admin/organizations/${orgId}/members/${vendorMemberId}`)
  expect(inviteBody).toEqual({ destination: '+233200000002', roleId: 'vendor_manager', scope: 'vendor' })
})
