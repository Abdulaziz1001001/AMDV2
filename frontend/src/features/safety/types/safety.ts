export type SafetyIncidentStatus = 'open' | 'investigating' | 'resolved' | 'closed'

export interface SafetyIncident {
  id: string
  reporterId: string | { id?: string; name?: string; eid?: string }
  reporterName?: string
  projectId?: string | { id?: string; name?: string }
  date: string
  description: string
  severity: string
  status: SafetyIncidentStatus
  photos?: string[]
  location?: string
  resolvedBy?: string
  resolvedAt?: string
  resolution?: string
  createdAt?: string
}

export interface SafetyIncidentPayload {
  date: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
}
