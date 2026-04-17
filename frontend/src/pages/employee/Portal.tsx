import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/stores/AuthContext'
import { useLang } from '@/stores/LangContext'
import { useTheme } from '@/stores/ThemeContext'
import { Button } from '@/components/ui/Button'
import { Clock, Briefcase, Bell, Globe, Moon, Sun, LogOut } from 'lucide-react'
import Attendance from './Attendance'
import HrTab from './HrTab'
import Notifications from './Notifications'

const tabs = [
  { key: 'attendance', icon: Clock, label: 'Attendance' },
  { key: 'hr', icon: Briefcase, label: 'HR' },
  { key: 'notifications', icon: Bell, label: 'Notifications' },
] as const

type Tab = typeof tabs[number]['key']

export default function Portal() {
  const { session, logout } = useAuth()
  const { toggle: toggleLang } = useLang()
  const { toggle: toggleTheme, theme } = useTheme()
  const [tab, setTab] = useState<Tab>('attendance')

  return (
    <div className="min-h-screen bg-surface-sunken">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border-subtle bg-surface/80 backdrop-blur-xl px-4 sm:px-6 h-14">
        <div className="flex items-center gap-3">
          <img src="/assets/logo-amd.png" alt="AMD" className="h-7 w-7 rounded-lg" />
          <span className="text-sm font-semibold text-text-primary hidden sm:block">AMD United</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={toggleLang}><Globe className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme}>{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</Button>
          <div className="flex items-center gap-2 ml-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">{session?.name?.charAt(0)?.toUpperCase()}</div>
            <span className="text-sm font-medium text-text-primary hidden sm:block">{session?.name}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={logout}><LogOut className="h-4 w-4" /></Button>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-6 pb-20 max-w-3xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {tab === 'attendance' && <Attendance />}
            {tab === 'hr' && <HrTab />}
            {tab === 'notifications' && <Notifications />}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border-subtle bg-surface/90 backdrop-blur-xl">
        <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition-colors ${tab === t.key ? 'text-accent' : 'text-text-tertiary'}`}
            >
              <t.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
