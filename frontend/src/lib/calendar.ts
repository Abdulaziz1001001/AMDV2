export interface WorkPolicy {
  timeZone?: string
  defaultWeekendDays?: number[]
  companyHolidays?: { date: string; nameEn?: string; nameAr?: string }[]
  lateGraceMinutes?: number
  annualLeaveDays?: number
  overtimeRateMultiplier?: number
  maxBreakMinutes?: number
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
  excuseReasons?: { code: string; labelEn: string; labelAr: string }[]
  id?: string
}

export interface GroupData {
  id: string
  weekendDays?: number[]
  ignoreCompanyHolidays?: boolean
  extraNonWorkDates?: string[]
}

export function effectiveWeekendDays(
  groupId: string | undefined,
  groups: GroupData[],
  policy: WorkPolicy | null,
): number[] {
  if (groupId) {
    const g = groups.find((x) => x.id === groupId)
    if (g?.weekendDays?.length) return g.weekendDays
  }
  return policy?.defaultWeekendDays ?? [5, 6]
}

export function isWorkingDay(
  dateStr: string,
  groupId: string | undefined,
  groups: GroupData[] = [],
  policy: WorkPolicy | null = null,
): boolean {
  const d = new Date(dateStr)
  const dow = d.getUTCDay()
  const we = effectiveWeekendDays(groupId, groups, policy)
  if (we.includes(dow)) return false

  const group = groupId ? groups.find((x) => x.id === groupId) : undefined
  if (!(group?.ignoreCompanyHolidays)) {
    const holidays = policy?.companyHolidays ?? []
    if (holidays.some((h) => h.date === dateStr)) return false
  }

  if (group?.extraNonWorkDates?.includes(dateStr)) return false
  return true
}
