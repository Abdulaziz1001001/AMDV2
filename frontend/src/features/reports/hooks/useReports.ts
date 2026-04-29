import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchReports } from '@/features/reporting/api/reportingApi'

export function useReports(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['reports', startDate, endDate],
    queryFn: () => fetchReports(startDate, endDate),
    enabled: Boolean(startDate && endDate && startDate <= endDate),
    placeholderData: keepPreviousData,
  })
}
