import { request } from '@/api/client'
import type { Location, Project, ProjectInput } from '@/features/projects/types/projects'

export function fetchProjects() {
  return request<Project[]>('/projects')
}

export function createProject(data: ProjectInput) {
  return request<Project>('/projects', 'POST', data)
}

export function updateProject(id: string, data: Partial<ProjectInput>) {
  return request<Project>(`/projects/${id}`, 'PUT', data)
}

export function deleteProject(id: string) {
  return request(`/projects/${id}`, 'DELETE')
}

export function createLocation(data: Partial<Location>) {
  return request('/admin/location', 'POST', data)
}

export function deleteLocation(id: string) {
  return request(`/admin/location/${id}`, 'DELETE')
}
