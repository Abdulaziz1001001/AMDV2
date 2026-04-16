import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/stores/AuthContext'
import { useLang } from '@/stores/LangContext'
import { Shield, User } from 'lucide-react'

export default function Home() {
  const { goto } = useAuth()
  const { t } = useLang()

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-sunken">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-sm px-6"
      >
        <div className="text-center mb-10">
          <motion.img
            src="/assets/logo-amd.png"
            alt="AMD United"
            className="h-16 w-16 rounded-2xl mx-auto mb-5 shadow-md"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          />
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">{t('welcome')}</h1>
          <p className="mt-2 text-sm text-text-secondary">{t('subtitle')}</p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => goto('admin')}
            size="lg"
            className="w-full justify-start gap-3"
          >
            <Shield className="h-5 w-5" />
            {t('adminLogin')}
          </Button>
          <Button
            onClick={() => goto('employee')}
            variant="secondary"
            size="lg"
            className="w-full justify-start gap-3"
          >
            <User className="h-5 w-5" />
            {t('employeeLogin')}
          </Button>
        </div>

        <p className="mt-8 text-center text-xs text-text-tertiary">
          AMD United Contracting Company
        </p>
      </motion.div>
    </div>
  )
}
