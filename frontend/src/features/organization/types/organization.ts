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

export interface Department {
  id: string
  name: string
  managerId?: { id?: string; name?: string; eid?: string } | string
}
