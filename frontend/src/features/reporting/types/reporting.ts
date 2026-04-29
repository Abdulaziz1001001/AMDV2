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
  checkoutLocation?: string
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
