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
