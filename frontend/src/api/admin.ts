import { request } from './client'
import type { AttendanceReportDeptRow, AttendanceReportEmployeeRow } from '@/lib/exportTable'

export interface AllDataResponse {
  employees: Employee[]
  groups: Group[]
  locations: Location[]
  records: AttendanceRecord[]
  departments: Department[]
  leaveRequests: LeaveRequest[]
  workPolicy: WorkPolicyData | null
  notificationUnreadCount: number
  projects: Project[]
  shifts: Shift[]
  announcements: Announcement[]
}

export interface Employee {
  id: string
  eid?: string
  name: string
  username: string
  email?: string
  phone?: string
  groupId?: string
  workStart?: string
  workEnd?: string
  salary?: number
  departmentId?: string
  jobTitle?: string
  hireDate?: string
  active: boolean
  emergencyContact?: { name?: string; phone?: string; relation?: string }
  address?: string
  photoUrl?: string
  leaveBalance?: number
  lastAccrualDate?: string
}

export interface Group {
  id: string
  name: string
  desc?: string
  color?: string
  weekendDays?: number[]
  ignoreCompanyHolidays?: boolean
  extraNonWorkDates?: string[]
}

export interface Location {
  id: string
  name: string
  groupId?: string
  /** Empty or omitted = open to all (subject to legacy groupId rules on backend) */
  allowedGroups?: string[]
  lat: number
  lng: number
  radius: number
}

export interface AttendanceRecord {
  id: string
  employeeId: string
  date: string
  checkIn?: string
  checkOut?: string
  checkInLat?: number
  checkInLng?: number
  checkOutLat?: number
  checkOutLng?: number
  status: string
  notes?: string
  approvalStatus?: string
  isForgiven?: boolean
  attachment?: string
  projectId?: string
  locationName?: string
  checkoutLocationName?: string
  breaks?: { start?: string; end?: string }[]
  overtimeMinutes?: number
}

export interface Department {
  id: string
  name: string
  managerId?: { id?: string; name?: string; eid?: string } | string
}

export interface LeaveRequest {
  id: string
  employeeId: { id?: string; name?: string; eid?: string } | string
  startDate: string
  endDate: string
  type: string
  status: string
  reason?: string
  requestedDays: number
  attachmentUrl?: string
  approvedBy?: string
  approvedByRole?: string
  approvedAt?: string
  approvalLevel?: number
  approvalHistory?: { role: string; action: string; actionAt: string }[]
}

export interface WorkPolicyData {
  id?: string
  timeZone?: string
  defaultWeekendDays?: number[]
  companyHolidays?: { date: string; nameEn?: string; nameAr?: string }[]
  lateGraceMinutes?: number
  annualLeaveDays?: number
  overtimeRateMultiplier?: number
  maxBreakMinutes?: number
  excuseReasons?: { code: string; labelEn: string; labelAr: string }[]
  leaveAccrual?: {
    enabled?: boolean
    monthlyRate?: number
    probationMonths?: number
    maxCarryForward?: number
    encashmentAllowed?: boolean
    encashmentMaxDays?: number
  }
  approvalChains?: { type: string; steps: { role: string; label: string }[] }[]
  onboardingItems?: string[]
  offboardingItems?: string[]
}

export interface Project {
  id: string
  name: string
  code?: string
  address?: string
  groupId?: string
  lat?: number
  lng?: number
  radius?: number
  status: string
  managerId?: { id?: string; name?: string } | string
  startDate?: string
  expectedEnd?: string
}

export interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
  color?: string
  isDefault?: boolean
}

export interface Announcement {
  id: string
  title: string
  titleAr?: string
  body: string
  bodyAr?: string
  priority?: string
  targetType?: string
  targetId?: string
  createdBy?: string
  createdByName?: string
  expiresAt?: string
  pinned?: boolean
  createdAt?: string
}

export interface EarlyCheckout {
  id: string
  employeeId: string | { id?: string; name?: string; eid?: string }
  attendanceId?: string | { date?: string; checkIn?: string }
  checkoutTime: string
  reason: string
  status: string
  approvedBy?: string
  approvedAt?: string
  createdAt?: string
}

export interface OvertimeEntry {
  id: string
  employeeId: string | { id?: string; name?: string; eid?: string }
  attendanceId?: string
  date: string
  extraMinutes: number
  reason?: string
  status: string
  approvedBy?: string
  approvedAt?: string
  rateMultiplier?: number
}

export interface Notification {
  id: string
  type: string
  title: string
  titleAr?: string
  body: string
  bodyAr?: string
  ref?: { kind: string; id: string }
  recipientId?: string
  readAt?: string
  createdAt?: string
}

export interface SafetyIncident {
  id: string
  reporterId: string | { id?: string; name?: string; eid?: string }
  reporterName?: string
  projectId?: string | { id?: string; name?: string }
  date: string
  description: string
  severity: string
  status: string
  photos?: string[]
  location?: string
  resolvedBy?: string
  resolvedAt?: string
  resolution?: string
  createdAt?: string
}

export function fetchAllData() {
  return request<AllDataResponse>('/admin/all-data')
}

export interface AdminNotificationsResponse {
  items: Notification[]
  unreadCount: number
}

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

export function fetchEarlyCheckouts() {
  return request<EarlyCheckout[]>('/checkouts/early')
}

export function fetchOvertimes() {
  return request<OvertimeEntry[]>('/overtime')
}

export function fetchSafetyIncidents() {
  return request<SafetyIncident[]>('/safety')
}

export function updateWorkPolicy(body: Partial<WorkPolicyData>) {
  return request<WorkPolicyData>('/admin/work-policy', 'PUT', body)
}

export interface AdminProfile {
  id: string
  username: string
  name: string
  email?: string
}

/** GET /admin/me — hydrate admin session after page reload (JWT still valid). */
export function fetchAdminProfile() {
  return request<AdminProfile>('/admin/me')
}

export interface AdminCredentialsUpdateResponse {
  msg: string
  username: string
  passwordChanged: boolean
}

export function updateAdminCredentials(body: {
  currentPassword: string
  newUsername: string
  newPassword?: string
}) {
  return request<AdminCredentialsUpdateResponse>('/admin/credentials', 'PUT', body)
}

export function createEmployee(data: Partial<Employee> & { password?: string }) {
  return request('/admin/employee', 'POST', data)
}

export function deleteEmployee(id: string) {
  return request(`/admin/employee/${id}`, 'DELETE')
}

export function createGroup(data: Partial<Group>) {
  return request('/admin/group', 'POST', data)
}

export function deleteGroup(id: string) {
  return request(`/admin/group/${id}`, 'DELETE')
}

export function createLocation(data: Partial<Location>) {
  return request('/admin/location', 'POST', data)
}

export function deleteLocation(id: string) {
  return request(`/admin/location/${id}`, 'DELETE')
}

export function upsertDepartment(data: { id?: string; name: string; managerId?: string }) {
  return request('/admin/department', 'POST', data)
}

export function deleteDepartment(id: string) {
  return request(`/admin/department/${id}`, 'DELETE')
}

export function approveRecord(id: string, status: string) {
  return request(`/admin/approve-record/${id}`, 'PUT', { approvalStatus: status })
}

export function updateLeaveRequest(id: string, status: string) {
  return request(`/admin/leave-requests/${id}`, 'PATCH', { status })
}

export function actionEarlyCheckout(id: string, status: string) {
  return request(`/checkouts/early/${id}/approve`, 'PUT', { status })
}

export function actionOvertime(id: string, status: 'approved' | 'declined') {
  return request(`/overtime/${id}/action`, 'PUT', { status })
}

export function fetchPayrollOverview(month: number, year: number) {
  return request(`/admin/payroll-overview?month=${month}&year=${year}`)
}

export function closeDay(date?: string) {
  return request('/attendance/close-day', 'POST', { date })
}

export function fetchAuditLog(params: { action?: string; from?: string; to?: string; limit?: number }) {
  const q = new URLSearchParams()
  if (params.action) q.set('action', params.action)
  if (params.from) q.set('from', params.from)
  if (params.to) q.set('to', params.to)
  if (params.limit) q.set('limit', String(params.limit))
  return request(`/audit?${q.toString()}`)
}

export interface AttendanceReportRecordRow {
  recordId: string
  employeeId: string
  employeeName: string
  employeeEid: string
  date: string
  checkIn: string
  checkOut: string
  locationName: string
  checkoutLocationName: string
  status: string
  notes: string
}

export interface AttendanceReportResponse {
  employees: AttendanceReportEmployeeRow[]
  departments: AttendanceReportDeptRow[]
  records?: AttendanceReportRecordRow[]
}

export function fetchAttendanceReport(params: {
  employeeId?: string
  employeeIds?: string[]
  month?: string
  year?: string
}) {
  const q = new URLSearchParams()
  if (params.employeeId) q.set('employeeId', params.employeeId)
  if (params.month) q.set('month', params.month)
  if (params.year) q.set('year', params.year)
  if (params.employeeIds?.length) q.set('employeeIds', params.employeeIds.join(','))
  return request<AttendanceReportResponse>(`/attendance/report?${q.toString()}`)
}
