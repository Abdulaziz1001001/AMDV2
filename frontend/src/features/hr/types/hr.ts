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

export interface MyLeaveRequestPayload {
  startDate: string
  endDate: string
  type: string
  reason?: string
}

export interface LeaveAccrualBalance {
  employeeId: string
  name: string
  eid?: string
  department?: string
  allowed: number
  used: number
  balance: number
  accrued: number
}
