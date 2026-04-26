import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/stores/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { useLang } from '@/stores/LangContext'
import { ArrowLeft, User } from 'lucide-react'

export default function EmployeeLogin() {
  const { empLogin, goto } = useAuth()
  const { toast } = useToast()
  const { t } = useLang()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) return toast('Fill in all fields', 'warning')
    setLoading(true)
    try {
      await empLogin(username, password)
      toast('Welcome!', 'success')
    } catch (err: unknown) {
      toast((err as Error).message || 'Login failed', 'error')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-sunken">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-sm px-6"
      >
        <button
          onClick={() => goto('home')}
          className="flex items-center gap-1.5 text-sm text-text-tertiary hover:text-text-primary mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="text-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-raised mx-auto mb-4">
            <User className="h-6 w-6 text-text-secondary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">{t('employeeLogin')}</h1>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">{t('username')}</label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">{t('password')}</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : t('login')}
          </Button>
        </form>
      </motion.div>
    </div>
  )
}
