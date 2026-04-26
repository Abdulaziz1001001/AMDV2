import { request } from '@/api/client'
import type { LeaveRequest } from '@/features/hr/types/hr'

function withId<T extends Record<string, unknown>>(row: T): T & { id: string } {
  const id = row.id ?? row._id
  return { ...row, id: String(id ?? '') } as T & { id: string }
}

export async function fetchDepartmentLeaves(): Promise<LeaveRequest[]> {
  const raw = await request<Record<string, unknown>[]>('/hr/department/leaves')
  return raw.map((r) => withId(r) as unknown as LeaveRequest)
}

export function patchDepartmentLeave(id: string, status: 'approved' | 'rejected') {
  return request(`/hr/department/leaves/${id}`, 'PATCH', { status })
}
