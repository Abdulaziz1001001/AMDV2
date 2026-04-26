import { request } from '@/api/client'
import type { EmployeeNotificationsResponse } from '../types/communication'

export function fetchEmployeeNotifications() {
  return request<EmployeeNotificationsResponse>('/hr/me/notifications')
}

export function markEmployeeNotificationRead(id: string) {
  return request<{ msg?: string; unreadCount?: number }>(`/hr/me/notifications/${id}/read`, 'PATCH')
}

export function markAllEmployeeNotificationsRead() {
  return request<{ msg?: string; unreadCount?: number }>('/hr/me/notifications/read-all', 'PUT')
}

export function deleteAllEmployeeNotifications() {
  return request<{ msg?: string; deletedCount?: number }>('/hr/me/notifications/all', 'DELETE')
}
