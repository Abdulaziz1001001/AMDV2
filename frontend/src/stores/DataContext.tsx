import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { fetchAllData, type AllDataResponse, type Employee, type Group, type AttendanceRecord, type Department, type LeaveRequest, type WorkPolicyData, type Shift, type Announcement } from '@/api/admin'
import type { Location as Loc, Project } from '@/features/projects/types/projects'

interface DataCtx {
  employees: Employee[]
  groups: Group[]
  locations: Loc[]
  records: AttendanceRecord[]
  departments: Department[]
  leaveRequests: LeaveRequest[]
  workPolicy: WorkPolicyData | null
  notificationUnreadCount: number
  projects: Project[]
  shifts: Shift[]
  announcements: Announcement[]
  loading: boolean
  sync: () => Promise<void>
}

const DataContext = createContext<DataCtx>({
  employees: [],
  groups: [],
  locations: [],
  records: [],
  departments: [],
  leaveRequests: [],
  workPolicy: null,
  notificationUnreadCount: 0,
  projects: [],
  shifts: [],
  announcements: [],
  loading: false,
  sync: async () => {},
})

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AllDataResponse>({
    employees: [],
    groups: [],
    locations: [],
    records: [],
    departments: [],
    leaveRequests: [],
    workPolicy: null,
    notificationUnreadCount: 0,
    projects: [],
    shifts: [],
    announcements: [],
  })
  const [loading, setLoading] = useState(false)

  const sync = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchAllData()
      setData(res)
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <DataContext.Provider
      value={{
        ...data,
        loading,
        sync,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
