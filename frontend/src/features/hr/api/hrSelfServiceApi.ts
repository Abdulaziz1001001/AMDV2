import { request } from '@/api/client'
import type { LeaveRequest, MyLeaveRequestPayload } from '@/features/hr/types/hr'

export function fetchMyLeaveRequests() {
  return request<LeaveRequest[]>('/hr/me/leave-requests')
}

export function createMyLeaveRequest(body: MyLeaveRequestPayload) {
  return request('/hr/me/leave-request', 'POST', body)
}
