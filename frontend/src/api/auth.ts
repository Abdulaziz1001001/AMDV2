import { request } from './client'

interface LoginResponse {
  token: string
  admin?: { id: string; username: string; name: string; email?: string }
  employee?: {
    id: string
    eid?: string
    name: string
    username: string
    role?: string
    departmentId?: string
    groupId?: string
    workStart?: string
    workEnd?: string
    salary?: number
  }
}

export async function adminLogin(username: string, password: string) {
  const res = await request<LoginResponse>('/auth/admin-login', 'POST', { username, password })
  localStorage.setItem('amd_token', res.token)
  localStorage.setItem('amd_role', 'admin')
  return res
}

export async function empLogin(username: string, password: string) {
  const res = await request<LoginResponse>('/auth/emp-login', 'POST', { username, password })
  localStorage.setItem('amd_token', res.token)
  localStorage.setItem('amd_role', res.employee?.role || 'employee')
  return res
}

export function logout() {
  localStorage.removeItem('amd_token')
  localStorage.removeItem('amd_role')
}

export function getStoredRole(): string | null {
  return localStorage.getItem('amd_role')
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('amd_token')
}
