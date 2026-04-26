import { request } from '@/api/client'
import type { SafetyIncident, SafetyIncidentPayload, SafetyIncidentStatus } from '@/features/safety/types/safety'

export function fetchSafetyIncidents() {
  return request<SafetyIncident[]>('/safety')
}

export function createSafetyIncident(payload: SafetyIncidentPayload) {
  return request('/safety', 'POST', payload)
}

export function updateSafetyIncidentStatus(id: string, status: SafetyIncidentStatus) {
  return request(`/safety/${id}`, 'PUT', { status })
}
