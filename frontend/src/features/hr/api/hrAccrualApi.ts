import { request } from '@/api/client'
import type { LeaveAccrualBalance } from '@/features/hr/types/hr'

export function fetchLeaveAccrualBalances() {
  return request<LeaveAccrualBalance[]>('/leave-accrual/balances')
}

export function runLeaveAccrual() {
  return request<{ msg: string }>('/leave-accrual/run-accrual', 'POST')
}
