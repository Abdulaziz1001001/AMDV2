import { request } from '@/api/client'
import type {
  AttendanceReportResponse,
  AttendanceReportQueryParams,
  AuditEntry,
  AuditLogQueryParams,
} from '@/features/reporting/types/reporting'

export function fetchPayrollOverview(month: number, year: number) {
  return request(`/admin/payroll-overview?month=${month}&year=${year}`)
}

export function fetchAuditLog(params: AuditLogQueryParams) {
  const q = new URLSearchParams()
  if (params.action) q.set('action', params.action)
  if (params.from) q.set('from', params.from)
  if (params.to) q.set('to', params.to)
  if (params.limit) q.set('limit', String(params.limit))
  return request<AuditEntry[]>(`/audit?${q.toString()}`)
}

export function fetchAttendanceReport(params: AttendanceReportQueryParams) {
  const q = new URLSearchParams()
  if (params.employeeId) q.set('employeeId', params.employeeId)
  if (params.month) q.set('month', params.month)
  if (params.year) q.set('year', params.year)
  if (params.employeeIds?.length) q.set('employeeIds', params.employeeIds.join(','))
  return request<AttendanceReportResponse>(`/attendance/report?${q.toString()}`)
}
