export interface AdminLoginRequest {
  email: string
  password: string
}

export interface AdminLoginResponse {
  token: string
}

const apiBaseUrl = (import.meta.env.VITE_ADMIN_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '')

export async function loginAdmin(credentials: AdminLoginRequest): Promise<AdminLoginResponse> {
  const response = await fetch(`${apiBaseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })

  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : 'Unable to sign in. Check your credentials and try again.'
    throw new Error(message)
  }

  if (typeof payload !== 'object' || payload === null || !('token' in payload) || typeof payload.token !== 'string' || !payload.token) {
    throw new Error('The login response did not include a valid session token.')
  }

  return { token: payload.token }
}
