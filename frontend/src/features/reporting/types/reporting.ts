export interface AuditEntry {
  _id: string
  actor?: string
  actorName?: string
  actorRole?: string
  action: string
  target?: string
  targetId?: string
  createdAt: string
  ip?: string
}

export interface AuditLogQueryParams {
  action?: string
  from?: string
  to?: string
  limit?: number
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

export interface AttendanceReportEmployeeRow {
  employeeId: string
  name: string
  eid: string
  department?: string
  totalDays: number
  present: number
  late: number
  absent: number
  onLeave: number
  overtimeHours: number
  totalBreakHours: number
}

export interface AttendanceReportDeptRow {
  department: string
  employees: number
  present: number
  late: number
  absent: number
  overtimeHours: number
}

export interface AttendanceReportResponse {
  employees: AttendanceReportEmployeeRow[]
  departments: AttendanceReportDeptRow[]
  records?: AttendanceReportRecordRow[]
}

export interface AttendanceReportQueryParams {
  employeeId?: string
  employeeIds?: string[]
  month?: string
  year?: string
}

export interface ReportEmployee {
  id: string
  name: string
  eid: string
  departmentId: string
}

export interface ReportRecordRow {
  id: string
  employeeId: string
  date: string
  checkIn?: string
  checkOut?: string
  status: string
  notes?: string
  locationName?: string
  checkoutLocationName?: string
  employee?: ReportEmployee
}

export interface MonthlyAttendanceDetailRow {
  employeeName: string
  date: string
  checkInTime: string
  checkInLocation: string
  checkOutTime: string
  checkOutLocation: string
  status: string
  notes: string
}
