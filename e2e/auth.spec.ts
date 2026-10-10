import { expect, test, type Page } from '@playwright/test'

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
}

async function routeLogin(page: Page, response: { status: number; body: unknown }) {
  await page.route('**/api/admin/login', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders })
      return
    }
    await route.fulfill({ status: response.status, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(response.body) })
  })
}

test('redirects protected routes to sign-in and returns after a successful admin login', async ({ page }) => {
  let loginRequest: { method: string; authorization: string | undefined; body: unknown } | undefined
  await page.route('**/api/admin/login', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders })
      return
    }
    loginRequest = {
      method: route.request().method(),
      authorization: route.request().headers().authorization,
      body: route.request().postDataJSON(),
    }
    await route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ token: 'admin-jwt' }) })
  })

  await page.goto('/app')
  await expect(page).toHaveURL(/\/signin\?redirect=/)
  await page.getByLabel('Email address').fill('admin@example.com')
  await page.getByLabel('Password').fill('correct horse battery staple')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL(/\/app$/)
  expect(loginRequest).toEqual({
    method: 'POST',
    authorization: undefined,
    body: { email: 'admin@example.com', password: 'correct horse battery staple' },
  })
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
  expect(await page.evaluate(() => sessionStorage.getItem('event-os-admin-session'))).toContain('admin-jwt')
})

test('shows the API error when admin credentials are rejected', async ({ page }) => {
  await routeLogin(page, { status: 401, body: { error: 'Invalid credentials' } })

  await page.goto('/signin')
  await page.getByLabel('Email address').fill('admin@example.com')
  await page.getByLabel('Password').fill('wrong-password')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByRole('alert')).toContainText('Invalid credentials')
  await expect(page).toHaveURL(/\/signin(?:\?.*)?$/)
})

test('signs out and protects the dashboard again', async ({ page }) => {
  await routeLogin(page, { status: 200, body: { token: 'admin-jwt' } })

  await page.goto('/signin')
  await page.getByLabel('Email address').fill('admin@example.com')
  await page.getByLabel('Password').fill('correct-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/app$/)
  await page.getByRole('button', { name: 'Sign out' }).click()

  await expect(page).toHaveURL(/\/signin(?:\?.*)?$/)
  await page.goto('/app')
  await expect(page).toHaveURL(/\/signin\?redirect=/)
})
