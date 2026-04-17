import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { useLang } from '@/stores/LangContext'
import { useAuth } from '@/stores/AuthContext'
import {
  LayoutDashboard,
  PieChart,
  Users,
  Layers,
  Building2,
  MapPin,
  Calendar,
  ClipboardList,
  Briefcase,
  HardHat,
  ClipboardCheck,
  Megaphone,
  AlertTriangle,
  BookUser,
  Calculator,
  History,
  FileBarChart,
  Settings,
  LogOut,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  key: string
  icon: LucideIcon
  labelKey: string
}

const menuItems: NavItem[] = [
  { key: 'dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { key: 'analytics', icon: PieChart, labelKey: 'analytics' },
  { key: 'employees', icon: Users, labelKey: 'employees' },
  { key: 'groups', icon: Layers, labelKey: 'groups' },
  { key: 'departments', icon: Building2, labelKey: 'departments' },
  { key: 'locations', icon: MapPin, labelKey: 'locations' },
  { key: 'calendar', icon: Calendar, labelKey: 'workCalendar' },
  { key: 'records', icon: ClipboardList, labelKey: 'records' },
  { key: 'hr', icon: Briefcase, labelKey: 'hrManagement' },
  { key: 'projects', icon: HardHat, labelKey: 'projectsSites' },
  { key: 'onboarding', icon: ClipboardCheck, labelKey: 'onboarding' },
  { key: 'announcements', icon: Megaphone, labelKey: 'announcements' },
  { key: 'safety', icon: AlertTriangle, labelKey: 'safetyIncidents' },
  { key: 'directory', icon: BookUser, labelKey: 'directoryOrgChart' },
  { key: 'accrual', icon: Calculator, labelKey: 'leaveAccrual' },
]

const systemItems: NavItem[] = [
  { key: 'audit', icon: History, labelKey: 'auditLog' },
  { key: 'reports', icon: FileBarChart, labelKey: 'reports' },
  { key: 'settings', icon: Settings, labelKey: 'settings' },
]

const navGroups: { id: string; labelKey: string; items: NavItem[] }[] = [
  { id: 'menu', labelKey: 'navMenu', items: menuItems },
  { id: 'system', labelKey: 'navSystem', items: systemItems },
]

const navItems: NavItem[] = [...menuItems, ...systemItems]

interface SidebarProps {
  activePanel: string
  onNavigate: (panel: string) => void
}

export function Sidebar({ activePanel, onNavigate }: SidebarProps) {
  const { t, lang } = useLang()
  const { session, logout } = useAuth()
  const isRtl = lang === 'ar'

  const displayName = session?.name?.trim() || session?.username || 'AMD'
  const initial = (displayName[0] || 'A').toUpperCase()

  return (
    <aside
      className={cn(
        'z-40 grid h-dvh w-[var(--sidebar-width)] grid-rows-[auto,minmax(0,1fr),auto] border-[#1f1f1f] bg-[#121212]',
        isRtl ? 'border-l' : 'border-r',
      )}
    >
      <div className="shrink-0 border-b border-[#1f1f1f] px-4 py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E05A2C] text-sm font-bold text-white shadow-sm">
            A
          </div>
          <div className="min-w-0 pt-0.5">
            <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-white">AMD United</p>
            <p className="mt-0.5 text-xs text-zinc-500">{t('adminPanel')}</p>
          </div>
        </div>
      </div>

      <nav className="min-h-0 overflow-y-auto overflow-x-hidden px-2 py-3">
        {navGroups.map((group) => (
          <div key={group.id} className="mb-1">
            <p
              className={cn(
                'mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500',
                group.id === 'menu' ? 'mt-0' : 'mt-5',
              )}
            >
              {t(group.labelKey)}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = activePanel === item.key
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onNavigate(item.key)}
                    className={cn(
                      'relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-colors',
                      isActive
                        ? 'text-[#E05A2C]'
                        : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100',
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-lg bg-[#E05A2C]/15"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    )}
                    <item.icon className="relative h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                    <span className="relative truncate">{t(item.labelKey)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-[#1f1f1f] p-3">
        <div className="flex items-center gap-3 rounded-lg px-1 py-1">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E05A2C] text-xs font-semibold text-white"
            aria-hidden
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-100">{displayName}</p>
            <p className="text-xs text-zinc-500">{t('adminRole')}</p>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="shrink-0 rounded-lg p-2 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-[#E05A2C]"
            title={t('logout')}
            aria-label={t('logout')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}

export { navItems, navGroups }
