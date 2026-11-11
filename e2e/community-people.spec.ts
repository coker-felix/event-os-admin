import { expect, test } from '@playwright/test'

test.use({ trace: 'off' })
const corsHeaders = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, PUT, OPTIONS', 'access-control-allow-headers': 'authorization, content-type' }
const empty = (field: string) => ({ [field]: [], total: 0 })

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('event-os-admin-session', JSON.stringify({ token: 'admin-test-token', tokenType: 'Bearer' })))
})

test('suspensions use user moderation actions and load the admin profile', async ({ page }) => {
  let suspensions = [{ userId: 'user-1', reason: 'Spam', until: '2026-07-13', suspendedBy: 'Moderator' }]
  const actions: Record<string, unknown>[] = []
  await page.route('**/api/admin/**', async route => {
    const url = new URL(route.request().url()); const method = route.request().method()
    if (url.pathname.endsWith('/users')) return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ users: [{ id: 'user-2', name: 'Ama Mensah', email: 'ama@example.com' }] }) })
    if (url.pathname.endsWith('/suspensions') && method === 'GET') return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ suspensions, total: suspensions.length }) })
    if (url.pathname.endsWith('/profiles/user-1')) return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ profile: { userId: 'user-1', displayName: 'Profile for user-1' }, accountState: 'suspended' }) })
    if (url.pathname.endsWith('/moderation-actions')) { const body = route.request().postDataJSON(); actions.push(body); if (body.action === 'unsuspend_user') suspensions = suspensions.filter(row => row.userId !== body.targetId); else if (body.action === 'suspend_user') suspensions.push({ userId: String(body.targetId), reason: String(body.reason), until: String(body.until ?? ''), suspendedBy: 'Moderator' }); return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: '{}' }) }
    return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: '{}' })
  })
  await page.goto('/app/community/suspensions')
  await expect(page.getByText('13th Jul 26')).toBeVisible()
  await page.getByRole('row').filter({ hasText: 'user-1' }).click()
  await expect(page.getByText(/Profile for user-1/)).toBeVisible()
  await page.getByRole('button', { name: 'Suspend a user' }).click()
  await page.getByLabel('Find user').fill('Ama')
  await page.getByLabel('User', { exact: true }).selectOption('user-2')
  await page.getByLabel('Reason').fill('Repeated abuse')
  await page.getByRole('button', { name: 'Suspension end date' }).click()
  // The picker date entry is calendar based; select tomorrow through its accessible day button.
  const future = new Date(); future.setDate(future.getDate() + 1)
  await page.getByRole('button', { name: new RegExp(`\\b${future.getDate()}(st|nd|rd|th)?\\b`) }).click()
  await page.getByRole('button', { name: 'Suspend user' }).click()
  await expect.poll(() => actions.length).toBe(1)
  expect(actions[0]).toMatchObject({ targetType: 'user', targetId: 'user-2', action: 'suspend_user', until: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) })
  await page.getByRole('row').filter({ hasText: 'user-1' }).getByRole('button', { name: 'Unsuspend' }).click()
  await page.getByLabel('Reason').fill('Appeal accepted')
  await page.getByRole('button', { name: 'Unsuspend', exact: true }).last().click()
  await expect.poll(() => actions.length).toBe(2)
  expect(actions[1]).toMatchObject({ targetType: 'user', targetId: 'user-1', action: 'unsuspend_user' })
})

test('null suspension end date and empty lists have safe copy', async ({ page }) => {
  await page.route('**/api/admin/**', route => route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(new URL(route.request().url()).pathname.endsWith('/suspensions') ? { suspensions: [{ userId: 'u', until: '' }], total: 1 } : { users: [] }) }))
  await page.goto('/app/community/suspensions')
  await expect(page.getByText('No end date')).toBeVisible()
})

test('badges grant and revoke both badge kinds through their filter', async ({ page }) => {
  const posts: Record<string, unknown>[] = []
  const granted = new Set<string>(['staff'])
  await page.route('**/api/admin/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/users')) return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ users: [{ id: 'user-1', name: 'Ama Mensah' }] }) })
    if (url.pathname.endsWith('/badges') && route.request().method() === 'GET') { const badge = url.searchParams.get('badge') ?? 'founding_member'; return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(granted.has(badge) ? { badges: [{ userId: 'user-1', badge, grantedBy: 'admin-1', grantedAt: '2026-07-13T10:00:00Z' }], total: 1 } : empty('badges')) }) }
    if (url.pathname.endsWith('/badges') && route.request().method() === 'POST') { const body = route.request().postDataJSON(); posts.push(body); const key = String(body.badge); if (body.grant) granted.add(key); else granted.delete(key); return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: '{}' }) }
    return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: '{}' })
  })
  await page.goto('/app/community/badges')
  await page.getByRole('button', { name: 'Grant badge' }).click(); await page.getByLabel('User', { exact: true }).selectOption('user-1'); await page.getByLabel(/confirm this badge grant/i).check(); await page.getByRole('button', { name: 'Grant badge' }).last().click()
  await expect.poll(() => posts.length).toBe(1); expect(posts[0]).toMatchObject({ badge: 'founding_member', grant: true })
  await page.getByRole('button', { name: 'Revoke' }).click(); await page.getByRole('button', { name: 'Revoke badge' }).last().click()
  await expect.poll(() => posts.length).toBe(2); expect(posts[1]).toMatchObject({ badge: 'founding_member', grant: false })
  await page.getByRole('button', { name: 'Staff' }).click(); await expect(page.getByText('user-1').first()).toBeVisible(); await page.getByRole('button', { name: 'Revoke' }).click(); await page.getByRole('button', { name: 'Revoke badge' }).last().click()
  await expect.poll(() => posts.length).toBe(3); expect(posts[2]).toMatchObject({ badge: 'staff', grant: false })
  await page.getByRole('button', { name: 'Grant badge' }).click(); await page.getByLabel('User', { exact: true }).selectOption('user-1'); await page.getByLabel(/confirm this badge grant/i).check(); await page.getByRole('button', { name: 'Grant badge' }).last().click()
  await expect.poll(() => posts.length).toBe(4); expect(posts[3]).toMatchObject({ badge: 'staff', grant: true })
})

test('skills work while community is off and slug collision keeps dialog open; no delete action', async ({ page }) => {
  let collision = true
  await page.route('**/api/admin/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/skills') && route.request().method() === 'GET') return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ skills: [{ id: 'skill-1', name: 'Stage management', slug: 'stage_management' }], total: 1 }) })
    if (url.pathname.endsWith('/skills/')) return route.fulfill({ status: collision ? 409 : 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(collision ? { error: 'Conflict', reason: 'slug_taken' } : {}) })
    if (url.pathname.includes('/skills/')) return route.fulfill({ status: collision ? 409 : 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(collision ? { error: 'Conflict', reason: 'slug_taken' } : {}) })
    return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: '{}' })
  })
  await page.goto('/app/community/skills')
  await expect(page.getByText('Stage management')).toBeVisible()
  await expect(page.getByRole('button', { name: /delete/i })).toHaveCount(0)
  await page.getByRole('button', { name: 'Add skill' }).click(); await page.getByLabel('Skill name').fill('Event safety'); await page.getByLabel('Skill slug').fill('event_safety'); await page.getByRole('button', { name: 'Save skill' }).click()
  await expect(page.getByRole('alert')).toHaveText('That slug is already in use'); await expect(page.getByRole('dialog')).toBeVisible()
  collision = false
})
