import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/cn'
import { useLang } from '@/stores/LangContext'
import {
  LayoutDashboard,
  PieChart,
  Users,
  Layers,
  MapPin,
  Calendar,
  ClipboardList,
  Briefcase,
  ArrowLeftRight,
  HardHat,
  ClipboardCheck,
  Megaphone,
  AlertTriangle,
  FolderOpen,
  BookUser,
  Calculator,
  History,
  FileBarChart,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  key: string
  icon: LucideIcon
  labelKey: string
}

const navItems: NavItem[] = [
  { key: 'dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { key: 'analytics', icon: PieChart, labelKey: 'analytics' },
  { key: 'employees', icon: Users, labelKey: 'employees' },
  { key: 'groups', icon: Layers, labelKey: 'groups' },
  { key: 'locations', icon: MapPin, labelKey: 'locations' },
  { key: 'calendar', icon: Calendar, labelKey: 'workCalendar' },
  { key: 'records', icon: ClipboardList, labelKey: 'records' },
  { key: 'hr', icon: Briefcase, labelKey: 'hrManagement' },
  { key: 'shifts', icon: ArrowLeftRight, labelKey: 'shiftsRoster' },
  { key: 'projects', icon: HardHat, labelKey: 'projectsSites' },
  { key: 'onboarding', icon: ClipboardCheck, labelKey: 'onboarding' },
  { key: 'announcements', icon: Megaphone, labelKey: 'announcements' },
  { key: 'safety', icon: AlertTriangle, labelKey: 'safetyIncidents' },
  { key: 'documents', icon: FolderOpen, labelKey: 'documentVault' },
  { key: 'directory', icon: BookUser, labelKey: 'directory' },
  { key: 'accrual', icon: Calculator, labelKey: 'leaveAccrual' },
  { key: 'audit', icon: History, labelKey: 'auditLog' },
  { key: 'reports', icon: FileBarChart, labelKey: 'reports' },
  { key: 'settings', icon: Settings, labelKey: 'settings' },
]

interface SidebarProps {
  activePanel: string
  onNavigate: (panel: string) => void
}

export function Sidebar({ activePanel, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { t, lang } = useLang()
  const isRtl = lang === 'ar'

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      className={cn(
        'fixed top-0 h-screen bg-surface z-40 flex flex-col overflow-hidden',
        isRtl ? 'right-0 border-l border-border-subtle' : 'left-0 border-r border-border-subtle',
      )}
    >
      {/* Logo area */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-border-subtle shrink-0">
        <img src="/assets/logo-amd.png" alt="AMD" className="h-8 w-8 rounded-lg object-cover shrink-0" />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="text-sm font-semibold tracking-tight text-text-primary whitespace-nowrap overflow-hidden"
            >
              AMD United
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = activePanel === item.key
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={cn(
                'relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised',
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-accent-soft"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <item.icon className="relative h-[18px] w-[18px] shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="relative whitespace-nowrap overflow-hidden"
                  >
                    {t(item.labelKey)}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border-subtle p-2 shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-text-tertiary hover:text-text-primary hover:bg-surface-raised transition-colors"
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap"
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  )
}

export { navItems }
