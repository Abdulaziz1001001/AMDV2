import { request } from './client'

/** Backend returns `user`; AuthContext expects `admin` / `employee`. */
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

type BackendUserEnvelope = { token: string; user: Record<string, unknown> }

function idString(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'object' && v !== null && '$oid' in v && typeof (v as { $oid: string }).$oid === 'string') {
    return (v as { $oid: string }).$oid
  }
  return String(v)
}

export async function adminLogin(username: string, password: string) {
  const res = await request<BackendUserEnvelope>('/auth/admin-login', 'POST', { username, password })
  localStorage.setItem('amd_token', res.token)
  localStorage.setItem('amd_role', 'admin')
  const u = res.user as { id?: unknown; name?: string; username?: string; email?: string }
  const out: LoginResponse = {
    token: res.token,
    admin: {
      id: idString(u.id),
      name: u.name ?? '',
      username: u.username ?? username,
      email: u.email,
    },
  }
  return out
}

export async function empLogin(username: string, password: string) {
  const res = await request<BackendUserEnvelope>('/auth/emp-login', 'POST', { username, password })
  const u = res.user as {
    id?: unknown
    name?: string
    username?: string
    eid?: string
    role?: string
    departmentId?: string
    groupId?: string
    workStart?: string
    workEnd?: string
    salary?: number
  }
  localStorage.setItem('amd_token', res.token)
  localStorage.setItem('amd_role', u.role || 'employee')
  const out: LoginResponse = {
    token: res.token,
    employee: {
      id: idString(u.id),
      name: u.name ?? '',
      username: u.username ?? username,
      eid: u.eid,
      role: u.role,
      departmentId: u.departmentId != null ? idString(u.departmentId) : undefined,
      groupId: u.groupId != null ? idString(u.groupId) : undefined,
      workStart: u.workStart,
      workEnd: u.workEnd,
      salary: u.salary,
    },
  }
  return out
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
