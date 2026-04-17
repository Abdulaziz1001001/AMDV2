import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileNav } from './MobileNav'
import { useData } from '@/stores/DataContext'
import { useLang } from '@/stores/LangContext'
import { useToast } from '@/components/ui/Toast'
import { Skeleton } from '@/components/ui/Skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import type { ReactNode } from 'react'

const Dashboard = lazy(() => import('@/pages/admin/Dashboard'))
const Employees = lazy(() => import('@/pages/admin/Employees'))
const Groups = lazy(() => import('@/pages/admin/Groups'))
const Locations = lazy(() => import('@/pages/admin/Locations'))
const Records = lazy(() => import('@/pages/admin/Records'))
const HrManagement = lazy(() => import('@/pages/admin/HrManagement'))
const WorkCalendar = lazy(() => import('@/pages/admin/Calendar'))
const Shifts = lazy(() => import('@/pages/admin/Shifts'))
const Projects = lazy(() => import('@/pages/admin/Projects'))
const Onboarding = lazy(() => import('@/pages/admin/Onboarding'))
const Announcements = lazy(() => import('@/pages/admin/Announcements'))
const Safety = lazy(() => import('@/pages/admin/Safety'))
const Documents = lazy(() => import('@/pages/admin/Documents'))
const Directory = lazy(() => import('@/pages/admin/Directory'))
const LeaveAccrual = lazy(() => import('@/pages/admin/LeaveAccrual'))
const Audit = lazy(() => import('@/pages/admin/Audit'))
const Reports = lazy(() => import('@/pages/admin/Reports'))
const SettingsPage = lazy(() => import('@/pages/admin/Settings'))
const Analytics = lazy(() => import('@/pages/admin/Analytics'))

const panels: Record<string, () => ReactNode> = {
  dashboard: () => <Dashboard />,
  analytics: () => <Analytics />,
  employees: () => <Employees />,
  groups: () => <Groups />,
  locations: () => <Locations />,
  calendar: () => <WorkCalendar />,
  records: () => <Records />,
  hr: () => <HrManagement />,
  shifts: () => <Shifts />,
  projects: () => <Projects />,
  onboarding: () => <Onboarding />,
  announcements: () => <Announcements />,
  safety: () => <Safety />,
  documents: () => <Documents />,
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
  locations: 'locations',
  calendar: 'workCalendar',
  records: 'records',
  hr: 'hrManagement',
  shifts: 'shiftsRoster',
  projects: 'projectsSites',
  onboarding: 'onboarding',
  announcements: 'announcements',
  safety: 'safetyIncidents',
  documents: 'documentVault',
  directory: 'directory',
  accrual: 'leaveAccrual',
  audit: 'auditLog',
  reports: 'reports',
  settings: 'settings',
}

export function PageShell() {
  const [activePanel, setActivePanel] = useState('dashboard')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { sync, loading, notificationUnreadCount } = useData()
  const { t, lang } = useLang()
  const { toast } = useToast()

  useEffect(() => {
    sync().then(() => toast('Synced', 'success')).catch(() => toast('Sync failed', 'error'))
  }, [])

  const handleRefresh = useCallback(async () => {
    try {
      await sync()
      toast(t('synced'), 'success')
    } catch {
      toast('Sync failed', 'error')
    }
  }, [sync, toast, t])

  const renderPanel = panels[activePanel]

  return (
    <div className="admin-shell flex h-screen overflow-hidden bg-surface-sunken">
      <div className="hidden lg:block">
        <Sidebar activePanel={activePanel} onNavigate={setActivePanel} />
      </div>
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} activePanel={activePanel} onNavigate={setActivePanel} />

      <div className={`flex-1 flex flex-col overflow-hidden transition-[margin] duration-300 ${lang === 'ar' ? 'lg:mr-[var(--sidebar-width)]' : 'lg:ml-[var(--sidebar-width)]'}`}>
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
