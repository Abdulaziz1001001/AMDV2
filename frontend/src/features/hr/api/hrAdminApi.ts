import { request } from '@/api/client'

export function updateLeaveRequest(id: string, status: string) {
  return request(`/admin/leave-requests/${id}`, 'PATCH', { status })
}
