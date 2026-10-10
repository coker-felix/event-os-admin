import { adminApiBaseUrl, authenticatedAdminFetch } from './admin-auth'

export interface AdminUser {
  id: string
  name: string
  email: string
  status: string
}

export interface AdminRole {
  id: string
  name: string
  scope: string
  description: string
}

export interface AdminPermission {
  id: string
  name: string
  scope: string
  description: string
}

async function request<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')

  const response = await authenticatedAdminFetch(token, `${adminApiBaseUrl}${path}`, { ...init, headers })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string'
      ? payload.error
      : typeof payload === 'object' && payload !== null && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : `Request failed (${response.status}).`
    throw new Error(message)
  }
  return payload as T
}

export async function listAdmins(token: string) {
  return request<{ admins: AdminUser[] }>(token, '/api/admin/admins')
}

export async function createAdmin(token: string, input: { name: string; email: string; password: string }) {
  return request<{ id: string }>(token, '/api/admin/admins', { method: 'POST', body: JSON.stringify(input) })
}

export async function setAdminStatus(token: string, id: string, status: 'active' | 'suspended') {
  return request<{ id: string }>(token, `/api/admin/admins/${encodeURIComponent(id)}/status`, {
    method: 'PATCH', body: JSON.stringify({ status }),
  })
}

export async function deleteAdmin(token: string, id: string) {
  return request<{ deleted: string }>(token, `/api/admin/admins/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function listAdminRoles(token: string, adminId: string) {
  return request<{ roles: AdminRole[] }>(token, `/api/admin/admins/${encodeURIComponent(adminId)}/roles`)
}

export async function assignAdminRole(token: string, adminId: string, roleId: string) {
  return request<{ adminId: string; roleId: string }>(token, `/api/admin/admins/${encodeURIComponent(adminId)}/roles`, {
    method: 'POST', body: JSON.stringify({ roleId }),
  })
}

export async function removeAdminRole(token: string, adminId: string, roleId: string) {
  return request<{ deleted: string }>(token, `/api/admin/admins/${encodeURIComponent(adminId)}/roles/${encodeURIComponent(roleId)}`, { method: 'DELETE' })
}

export async function listRoles(token: string, scope?: string) {
  const query = scope ? `?scope=${encodeURIComponent(scope)}` : ''
  return request<{ roles: AdminRole[] }>(token, `/api/admin/roles${query}`)
}

export async function listRolePermissions(token: string, roleId: string) {
  return request<{ permissions: AdminPermission[] }>(token, `/api/admin/roles/${encodeURIComponent(roleId)}/permissions`)
}

export async function createRole(token: string, input: { name: string; scope: string; description?: string }) {
  return request<{ id: string }>(token, '/api/admin/roles', { method: 'POST', body: JSON.stringify(input) })
}

export async function listPermissions(token: string, scope?: string) {
  const query = scope ? `?scope=${encodeURIComponent(scope)}` : ''
  return request<{ permissions: AdminPermission[] }>(token, `/api/admin/permissions${query}`)
}

export async function createPermission(token: string, input: { name: string; scope: string; description?: string }) {
  return request<{ id: string }>(token, '/api/admin/permissions', { method: 'POST', body: JSON.stringify(input) })
}

export async function changeRolePermission(token: string, roleId: string, permissionId: string, operation: 'grant' | 'revoke') {
  const path = `/api/admin/roles/${encodeURIComponent(roleId)}/permissions${operation === 'revoke' ? `/${encodeURIComponent(permissionId)}` : ''}`
  return request<unknown>(token, path, {
    method: operation === 'grant' ? 'POST' : 'DELETE',
    ...(operation === 'grant' ? { body: JSON.stringify({ permissionId }) } : {}),
  })
}

