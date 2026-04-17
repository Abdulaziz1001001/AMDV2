import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export type HrSubTab = 'leaves' | 'ec' | 'ot'

interface AdminNavCtx {
  activePanel: string
  setActivePanel: (panel: string) => void
  pendingHrTab: HrSubTab | null
  pendingLeaveId: string | null
  pendingEarlyCheckoutId: string | null
  pendingOvertimeId: string | null
  pendingSafetyIncidentId: string | null
  goToLeaveRequest: (id: string) => void
  goToEarlyCheckout: (id: string) => void
  goToOvertime: (id: string) => void
  goToSafetyIncident: (id: string) => void
  clearPendingHrFocus: () => void
  clearPendingSafetyFocus: () => void
}

const AdminNavContext = createContext<AdminNavCtx | null>(null)

export function AdminNavProvider({ children }: { children: ReactNode }) {
  const [activePanel, setActivePanel] = useState('dashboard')
  const [pendingHrTab, setPendingHrTab] = useState<HrSubTab | null>(null)
  const [pendingLeaveId, setPendingLeaveId] = useState<string | null>(null)
  const [pendingEarlyCheckoutId, setPendingEarlyCheckoutId] = useState<string | null>(null)
  const [pendingOvertimeId, setPendingOvertimeId] = useState<string | null>(null)
  const [pendingSafetyIncidentId, setPendingSafetyIncidentId] = useState<string | null>(null)

  const goToLeaveRequest = useCallback((id: string) => {
    setPendingHrTab('leaves')
    setPendingLeaveId(id)
    setPendingEarlyCheckoutId(null)
    setPendingOvertimeId(null)
    setActivePanel('hr')
  }, [])

  const goToEarlyCheckout = useCallback((id: string) => {
    setPendingHrTab('ec')
    setPendingEarlyCheckoutId(id)
    setPendingLeaveId(null)
    setPendingOvertimeId(null)
    setActivePanel('hr')
  }, [])

  const goToOvertime = useCallback((id: string) => {
    setPendingHrTab('ot')
    setPendingOvertimeId(id)
    setPendingLeaveId(null)
    setPendingEarlyCheckoutId(null)
    setActivePanel('hr')
  }, [])

  const goToSafetyIncident = useCallback((id: string) => {
    setPendingSafetyIncidentId(id)
    setActivePanel('safety')
  }, [])

  const clearPendingHrFocus = useCallback(() => {
    setPendingHrTab(null)
    setPendingLeaveId(null)
    setPendingEarlyCheckoutId(null)
    setPendingOvertimeId(null)
  }, [])

  const clearPendingSafetyFocus = useCallback(() => {
    setPendingSafetyIncidentId(null)
  }, [])

  const value = useMemo(
    () => ({
      activePanel,
      setActivePanel,
      pendingHrTab,
      pendingLeaveId,
      pendingEarlyCheckoutId,
      pendingOvertimeId,
      pendingSafetyIncidentId,
      goToLeaveRequest,
      goToEarlyCheckout,
      goToOvertime,
      goToSafetyIncident,
      clearPendingHrFocus,
      clearPendingSafetyFocus,
    }),
    [
      activePanel,
      pendingHrTab,
      pendingLeaveId,
      pendingEarlyCheckoutId,
      pendingOvertimeId,
      pendingSafetyIncidentId,
      goToLeaveRequest,
      goToEarlyCheckout,
      goToOvertime,
      goToSafetyIncident,
      clearPendingHrFocus,
      clearPendingSafetyFocus,
    ],
  )

  return <AdminNavContext.Provider value={value}>{children}</AdminNavContext.Provider>
}

export function useAdminNav(): AdminNavCtx {
  const ctx = useContext(AdminNavContext)
  if (!ctx) throw new Error('useAdminNav must be used within AdminNavProvider')
  return ctx
}
