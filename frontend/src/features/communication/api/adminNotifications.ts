import { request } from '@/api/client'
import type { AdminNotificationsResponse } from '../types/communication'

export function fetchNotifications() {
  return request<AdminNotificationsResponse>('/admin/notifications')
}

export function markNotificationRead(id: string) {
  return request<{ msg?: string; unreadCount?: number }>(`/admin/notifications/${id}/read`, 'PATCH')
}

export function markAllNotificationsRead() {
  return request<{ msg?: string; unreadCount?: number }>('/admin/notifications/read-all', 'PUT')
}

export function deleteAllAdminNotifications() {
  return request<{ msg?: string; deletedCount?: number }>('/admin/notifications/all', 'DELETE')
}
