export interface Project {
  id: string
  name: string
  code?: string
  address?: string
  groupId?: string
  lat?: number
  lng?: number
  radius?: number
  status: string
  managerId?: { id?: string; name?: string } | string
  startDate?: string
  expectedEnd?: string
}

export interface Location {
  id: string
  name: string
  groupId?: string
  /** Empty or omitted = open to all (subject to legacy groupId rules on backend) */
  allowedGroups?: string[]
  lat: number
  lng: number
  radius: number
}

export interface ProjectInput {
  name: string
  code?: string
  address?: string
  lat?: number
  lng?: number
  radius?: number
}
