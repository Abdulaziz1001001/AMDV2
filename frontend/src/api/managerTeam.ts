import { request } from './client'
import type { EarlyCheckout, LeaveRequest, OvertimeEntry } from './admin'

function withId<T extends Record<string, unknown>>(row: T): T & { id: string } {
  const id = row.id ?? row._id
  return { ...row, id: String(id ?? '') } as T & { id: string }
}

/** GET /hr/department/leaves — manager role; may 404 if user does not manage a department */
export async function fetchDepartmentLeaves(): Promise<LeaveRequest[]> {
  const raw = await request<Record<string, unknown>[]>('/hr/department/leaves')
  return raw.map((r) => withId(r) as unknown as LeaveRequest)
}

/** GET /checkouts/early — scoped to department for managers */
export async function fetchTeamEarlyCheckouts(): Promise<EarlyCheckout[]> {
  const raw = await request<Record<string, unknown>[]>('/checkouts/early')
  return raw.map((r) => withId(r) as unknown as EarlyCheckout)
}

/** GET /overtime — scoped to department for managers */
export async function fetchTeamOvertimes(): Promise<OvertimeEntry[]> {
  const raw = await request<Record<string, unknown>[]>('/overtime')
  return raw.map((r) => withId(r) as unknown as OvertimeEntry)
}

export function patchDepartmentLeave(id: string, status: 'approved' | 'rejected') {
  return request(`/hr/department/leaves/${id}`, 'PATCH', { status })
}

export function approveEarlyCheckout(id: string, status: 'approved' | 'declined') {
  return request(`/checkouts/early/${id}/approve`, 'PUT', { status })
}

export function actionTeamOvertime(id: string, status: 'approved' | 'declined') {
  return request(`/overtime/${id}/action`, 'PUT', { status })
}
