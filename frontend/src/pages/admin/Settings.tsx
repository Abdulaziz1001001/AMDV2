import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useData } from '@/stores/DataContext'
import { useToast } from '@/components/ui/Toast'
import { useTheme } from '@/stores/ThemeContext'
import { useLang } from '@/stores/LangContext'
import { updateWorkPolicy } from '@/api/admin'

export default function Settings() {
  const { workPolicy, sync } = useData()
  const { toast } = useToast()
  const { theme, toggle: toggleTheme } = useTheme()
  const { lang, toggle: toggleLang, t } = useLang()
  const [annualLeave, setAnnualLeave] = useState(String(workPolicy?.annualLeaveDays ?? 30))
  const [otRate, setOtRate] = useState(String(workPolicy?.overtimeRateMultiplier ?? 1.5))
  const [maxBreak, setMaxBreak] = useState(String(workPolicy?.maxBreakMinutes ?? 60))
  const [accrualEnabled, setAccrualEnabled] = useState(workPolicy?.leaveAccrual?.enabled ?? false)
  const [accrualRate, setAccrualRate] = useState(String(workPolicy?.leaveAccrual?.monthlyRate ?? 2.5))
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await updateWorkPolicy({
        annualLeaveDays: Number(annualLeave),
        overtimeRateMultiplier: Number(otRate),
        maxBreakMinutes: Number(maxBreak),
        leaveAccrual: {
          ...workPolicy?.leaveAccrual,
          enabled: accrualEnabled,
          monthlyRate: Number(accrualRate),
        },
      })
      await sync()
      toast(t('settingsSaved'), 'success')
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    }
    setSaving(false)
  }

  const panelClass =
    'rounded-2xl bg-slate-50 px-6 py-8 dark:bg-slate-900/90 sm:px-8'

  return (
    <div className="max-w-2xl space-y-10">
      <section className={panelClass}>
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-text-tertiary">{t('appearance')}</h2>
        <div className="mt-6 space-y-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-text-primary">{t('theme')}</p>
              <p className="mt-0.5 text-xs text-text-tertiary">
                {t('themeCurrent')}: {theme === 'dark' ? t('darkMode') : t('lightMode')}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={toggleTheme}>
              {theme === 'dark' ? t('lightMode') : t('darkMode')}
            </Button>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-4 pt-6">
            <div>
              <p className="text-sm font-medium text-text-primary">{t('languageLabel')}</p>
              <p className="mt-0.5 text-xs text-text-tertiary">
                {t('languageCurrent')}: {lang === 'ar' ? 'العربية' : 'English'}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={toggleLang}>
              {lang === 'en' ? 'العربية' : 'English'}
            </Button>
          </div>
        </div>
      </section>

      <section className={panelClass}>
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-text-tertiary">{t('holidaysAndOvertime')}</h2>
        <div className="mt-8 space-y-10">
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-medium text-text-secondary">{t('annualLeaveDays')}</label>
              <Input type="number" value={annualLeave} onChange={(e) => setAnnualLeave(e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-text-secondary">{t('overtimeRateMultiplier')}</label>
              <Input type="number" step="0.1" value={otRate} onChange={(e) => setOtRate(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs font-medium text-text-secondary">{t('maxBreakMinutes')}</label>
              <Input type="number" value={maxBreak} onChange={(e) => setMaxBreak(e.target.value)} className="max-w-xs" />
            </div>
          </div>

          <div className="border-t border-slate-200/80 pt-10 dark:border-slate-700/80">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={accrualEnabled}
                onChange={(e) => setAccrualEnabled(e.target.checked)}
                className="accent-accent h-4 w-4 rounded border-border"
              />
              <span className="text-sm text-text-primary">{t('enableMonthlyAccrual')}</span>
            </label>
            {accrualEnabled && (
              <div className="mt-6">
                <label className="mb-2 block text-xs font-medium text-text-secondary">{t('monthlyAccrualRate')}</label>
                <Input type="number" step="0.5" value={accrualRate} onChange={(e) => setAccrualRate(e.target.value)} className="max-w-40" />
              </div>
            )}
          </div>
        </div>
      </section>

      <Button onClick={save} disabled={saving}>
        {saving ? t('savingSettings') : t('saveSettings')}
      </Button>
    </div>
  )
}
