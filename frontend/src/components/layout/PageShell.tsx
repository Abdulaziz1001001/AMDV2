import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileNav } from './MobileNav'
import { useData } from '@/stores/DataContext'
import { useAdminNav } from '@/stores/AdminNavContext'
import { useLang } from '@/stores/LangContext'
import { useToast } from '@/components/ui/Toast'
import { Skeleton } from '@/components/ui/Skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import type { ReactNode } from 'react'

const Dashboard = lazy(() => import('@/pages/admin/Dashboard'))
const Employees = lazy(() => import('@/pages/admin/Employees'))
const Groups = lazy(() => import('@/pages/admin/Groups'))
const Locations = lazy(() => import('@/features/projects/components/SitesPage'))
const Records = lazy(() => import('@/features/attendance/components/AttendanceRecordsPage'))
const HrManagement = lazy(() => import('@/features/hr/components/HrManagementPage'))
const WorkCalendar = lazy(() => import('@/pages/admin/Calendar'))
const Onboarding = lazy(() => import('@/pages/admin/Onboarding'))
const Announcements = lazy(() => import('@/pages/admin/Announcements'))
const Safety = lazy(() => import('@/features/safety/components/SafetyAdminPage'))
const Directory = lazy(() => import('@/pages/admin/Directory'))
const LeaveAccrual = lazy(() => import('@/features/hr/components/LeaveAccrualPage'))
const Audit = lazy(() => import('@/pages/admin/Audit'))
const Reports = lazy(() => import('@/pages/admin/Reports'))
const SettingsPage = lazy(() => import('@/pages/admin/Settings'))
const Analytics = lazy(() => import('@/pages/admin/Analytics'))
const Departments = lazy(() => import('@/pages/admin/Departments'))

const panels: Record<string, () => ReactNode> = {
  dashboard: () => <Dashboard />,
  analytics: () => <Analytics />,
  employees: () => <Employees />,
  groups: () => <Groups />,
  departments: () => <Departments />,
  locations: () => <Locations />,
  calendar: () => <WorkCalendar />,
  records: () => <Records />,
  hr: () => <HrManagement />,
  onboarding: () => <Onboarding />,
  announcements: () => <Announcements />,
  safety: () => <Safety />,
  directory: () => <Directory />,
  accrual: () => <LeaveAccrual />,
  audit: () => <Audit />,
  reports: () => <Reports />,
  settings: () => <SettingsPage />,
}

const panelTitleKeys: Record<string, string> = {
  dashboard: 'dashboard',
  analytics: 'analytics',
  employees: 'employees',
  groups: 'groups',
  departments: 'departments',
  locations: 'locations',
  calendar: 'workCalendar',
  records: 'records',
  hr: 'hrManagement',
  onboarding: 'onboarding',
  announcements: 'announcements',
  safety: 'safetyIncidents',
  directory: 'directory',
  accrual: 'leaveAccrual',
  audit: 'auditLog',
  reports: 'reports',
  settings: 'settings',
}

export function PageShell() {
  const { activePanel, setActivePanel } = useAdminNav()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { sync, loading, notificationUnreadCount } = useData()
  const { t, lang } = useLang()
  const { toast } = useToast()

  /** Portaled Radix surfaces inherit tokens from documentElement, not .admin-shell — align palette on html. */
  useEffect(() => {
    document.documentElement.setAttribute('data-admin', 'true')
    return () => document.documentElement.removeAttribute('data-admin')
  }, [])

  useEffect(() => {
    sync().then(() => toast(t('synced'), 'success')).catch(() => toast(t('syncFailed'), 'error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once
  }, [])

  const handleRefresh = useCallback(async () => {
    try {
      await sync()
      toast(t('synced'), 'success')
    } catch {
      toast(t('syncFailed'), 'error')
    }
  }, [sync, toast, t])

  const renderPanel = panels[activePanel]

  return (
    <div
      className={`admin-shell flex h-screen overflow-hidden bg-surface-sunken ${
        lang === 'ar' ? 'lg:flex-row-reverse' : 'lg:flex-row'
      }`}
    >
      <div className="hidden lg:block lg:h-dvh lg:shrink-0">
        <Sidebar activePanel={activePanel} onNavigate={setActivePanel} />
      </div>
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} activePanel={activePanel} onNavigate={setActivePanel} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          title={t(panelTitleKeys[activePanel] || activePanel)}
          unreadCount={notificationUnreadCount}
          onRefresh={handleRefresh}
          refreshing={loading}
          onMenuClick={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePanel}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="p-4 sm:p-6"
            >
              <Suspense fallback={<div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>}>
                {renderPanel ? renderPanel() : <div>Panel not found</div>}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
