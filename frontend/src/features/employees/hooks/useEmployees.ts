import { useQuery } from '@tanstack/react-query'
import { request } from '@/api/client'
import type { Employee } from '@/features/organization/types/organization'

interface EmployeesPagination {
  page: number
  pageSize: number
  total: number
  hasNextPage: boolean
}

interface EmployeesResponse {
  items: Employee[]
  pagination: EmployeesPagination
}

interface UseEmployeesParams {
  page?: number
  pageSize?: number
  activeOnly?: boolean
}

async function fetchEmployees(params: UseEmployeesParams): Promise<EmployeesResponse> {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 50
  const activeOnly = params.activeOnly ?? true
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    activeOnly: String(activeOnly),
  })
  return request<EmployeesResponse>(`/admin/employees?${query.toString()}`)
}

export function useEmployees(params: UseEmployeesParams = {}) {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 50
  const activeOnly = params.activeOnly ?? true

  return useQuery({
    queryKey: ['admin', 'employees', page, pageSize, activeOnly],
    queryFn: () => fetchEmployees({ page, pageSize, activeOnly }),
  })
}
