import { request } from '@/api/client'
import type { EarlyCheckout, OvertimeEntry } from '@/features/attendance/types/attendance'

export function fetchEarlyCheckouts() {
  return request<EarlyCheckout[]>('/checkouts/early')
}

export function fetchOvertimes() {
  return request<OvertimeEntry[]>('/overtime')
}

export function closeDay(date?: string) {
  return request('/attendance/close-day', 'POST', { date })
}

export function fetchAbsenteeTriggerTime() {
  return request<{ triggerTime: string }>('/attendance/absentee-trigger-time')
}

export function updateAbsenteeTriggerTime(triggerTime: string) {
  return request<{ triggerTime: string }>('/attendance/absentee-trigger-time', 'PUT', { triggerTime })
}
