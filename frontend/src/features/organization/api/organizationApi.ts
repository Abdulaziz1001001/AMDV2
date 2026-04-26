import { request } from '@/api/client'
import type { Employee, Group } from '@/features/organization/types/organization'

export function createEmployee(data: Partial<Employee> & { password?: string }) {
  return request('/admin/employee', 'POST', data)
}

export function deleteEmployee(id: string) {
  return request(`/admin/employee/${id}`, 'DELETE')
}

export function createGroup(data: Partial<Group>) {
  return request('/admin/group', 'POST', data)
}

export function deleteGroup(id: string) {
  return request(`/admin/group/${id}`, 'DELETE')
}

export function upsertDepartment(data: { id?: string; name: string; managerId?: string }) {
  return request('/admin/department', 'POST', data)
}

export function deleteDepartment(id: string) {
  return request(`/admin/department/${id}`, 'DELETE')
}
