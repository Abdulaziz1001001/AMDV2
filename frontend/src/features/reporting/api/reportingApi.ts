import { request } from '@/api/client'
import type {
  AuditEntry,
  AuditLogQueryParams,
  ReportRecordRow,
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

export function fetchReports(startDate: string, endDate: string, employeeId?: string) {
  const q = new URLSearchParams({ startDate, endDate })
  if (employeeId) q.set('employeeId', employeeId)
  return request<ReportRecordRow[]>(`/admin/reports?${q.toString()}`)
}
