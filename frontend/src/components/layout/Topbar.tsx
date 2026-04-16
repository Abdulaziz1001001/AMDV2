import { Bell, Globe, Moon, Sun, RefreshCw, LogOut, Menu } from 'lucide-react'
import { useTheme } from '@/stores/ThemeContext'
import { useLang } from '@/stores/LangContext'
import { useAuth } from '@/stores/AuthContext'
import { Button } from '@/components/ui/Button'
import { motion } from 'framer-motion'

interface TopbarProps {
  title: string
  unreadCount?: number
  onRefresh?: () => void
  onNotificationsClick?: () => void
  refreshing?: boolean
  onMenuClick?: () => void
}

export function Topbar({ title, unreadCount = 0, onRefresh, onNotificationsClick, refreshing, onMenuClick }: TopbarProps) {
  const { theme, toggle: toggleTheme } = useTheme()
  const { toggle: toggleLang, lang } = useLang()
  const { logout, session } = useAuth()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border-subtle bg-surface/80 backdrop-blur-xl px-6">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-lg font-semibold tracking-tight text-text-primary">{title}</h1>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onRefresh} title="Refresh">
          <motion.div animate={{ rotate: refreshing ? 360 : 0 }} transition={{ duration: 0.8, ease: 'linear', repeat: refreshing ? Infinity : 0 }}>
            <RefreshCw className="h-4 w-4" />
          </motion.div>
        </Button>

        <Button variant="ghost" size="icon" onClick={toggleLang} title={lang === 'en' ? 'العربية' : 'English'}>
          <Globe className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle theme">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <Button variant="ghost" size="icon" onClick={onNotificationsClick} className="relative" title="Notifications">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </Button>

        <div className="mx-2 h-6 w-px bg-border-subtle" />

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
            {session?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <span className="hidden sm:block text-sm font-medium text-text-primary">{session?.name || 'Admin'}</span>
        </div>

        <Button variant="ghost" size="icon" onClick={logout} title="Logout">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
