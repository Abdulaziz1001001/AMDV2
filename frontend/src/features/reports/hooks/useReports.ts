import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchReports } from '@/features/reporting/api/reportingApi'

export function useReports(startDate: string, endDate: string, employeeId?: string) {
  return useQuery({
    queryKey: ['reports', startDate, endDate, employeeId ?? 'all'],
    queryFn: () => fetchReports(startDate, endDate, employeeId),
    enabled: Boolean(startDate && endDate && startDate <= endDate),
    placeholderData: keepPreviousData,
  })
}
