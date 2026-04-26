import { request } from '@/api/client'
import type { EarlyCheckout, OvertimeEntry } from '@/features/attendance/types/attendance'

function withId<T extends Record<string, unknown>>(row: T): T & { id: string } {
  const id = row.id ?? row._id
  return { ...row, id: String(id ?? '') } as T & { id: string }
}

export async function fetchTeamEarlyCheckouts(): Promise<EarlyCheckout[]> {
  const raw = await request<Record<string, unknown>[]>('/checkouts/early')
  return raw.map((r) => withId(r) as unknown as EarlyCheckout)
}

export async function fetchTeamOvertimes(): Promise<OvertimeEntry[]> {
  const raw = await request<Record<string, unknown>[]>('/overtime')
  return raw.map((r) => withId(r) as unknown as OvertimeEntry)
}

export function approveEarlyCheckout(id: string, status: 'approved' | 'declined') {
  return request(`/checkouts/early/${id}/approve`, 'PUT', { status })
}

export function actionTeamOvertime(id: string, status: 'approved' | 'declined') {
  return request(`/overtime/${id}/action`, 'PUT', { status })
}
