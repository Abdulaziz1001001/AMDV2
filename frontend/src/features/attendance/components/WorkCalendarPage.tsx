import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useData } from '@/stores/DataContext'
import { useToast } from '@/components/ui/Toast'
import { updateWorkPolicy } from '@/api/admin'
import { useLang } from '@/stores/LangContext'
import { cn } from '@/lib/cn'

const DAY_KEYS = ['calDaySun', 'calDayMon', 'calDayTue', 'calDayWed', 'calDayThu', 'calDayFri', 'calDaySat'] as const

export default function WorkCalendar() {
  const { workPolicy, sync } = useData()
  const { toast } = useToast()
  const { t } = useLang()
  const [saving, setSaving] = useState(false)
  const [tz, setTz] = useState(workPolicy?.timeZone || 'Asia/Riyadh')
  const [grace, setGrace] = useState(String(workPolicy?.lateGraceMinutes ?? 15))
  const [weekends, setWeekends] = useState<number[]>(workPolicy?.defaultWeekendDays ?? [5, 6])

  const toggleWeekend = (d: number) => setWeekends((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d]))

  const save = async () => {
    setSaving(true)
    try {
      await updateWorkPolicy({ timeZone: tz, lateGraceMinutes: Number(grace), defaultWeekendDays: weekends })
      await sync()
      toast(t('policySaved'), 'success')
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    }
    setSaving(false)
  }

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = now.getDate()
  const holidays = (workPolicy?.companyHolidays || []).map((h) => h.date)

  const monthTitle = now.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const panelClass = 'border-0 shadow-none bg-slate-50 dark:bg-slate-900/90'

  return (
    <div className="space-y-8">
      <Card className={panelClass}>
        <CardHeader>
          <CardTitle>{monthTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center">
            {DAY_KEYS.map((key) => (
              <div key={key} className="py-2 text-xs font-medium text-text-tertiary">
                {t(key)}
              </div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dow = new Date(year, month, day).getDay()
              const isWeekend = weekends.includes(dow)
              const isHoliday = holidays.includes(dateStr)
              const isToday = day === today
              return (
                <div
                  key={day}
                  className={cn(
                    'flex h-10 items-center justify-center rounded-lg text-sm transition-colors',
                    isToday && 'font-semibold ring-2 ring-accent',
                    isHoliday
                      ? 'bg-danger-soft text-danger'
                      : isWeekend
                        ? 'bg-warning-soft text-warning'
                        : 'text-text-primary hover:bg-surface-raised',
                  )}
                >
                  {day}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card className={panelClass}>
        <CardHeader>
          <CardTitle>{t('workPolicySettings')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 grid grid-cols-2 gap-6">
            <div>
              <label className="mb-2 block text-xs font-medium text-text-secondary">{t('timeZone')}</label>
              <Input value={tz} onChange={(e) => setTz(e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-text-secondary">{t('lateGraceMinutes')}</label>
              <Input type="number" value={grace} onChange={(e) => setGrace(e.target.value)} />
            </div>
          </div>
          <div className="mb-6">
            <label className="mb-3 block text-xs font-medium text-text-secondary">{t('weekendDays')}</label>
            <div className="flex flex-wrap gap-2">
              {DAY_KEYS.map((key, i) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleWeekend(i)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                    weekends.includes(i)
                      ? 'bg-accent text-white'
                      : 'text-text-secondary hover:bg-surface-raised',
                  )}
                >
                  {t(key)}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={save} disabled={saving}>
            {saving ? t('savingPolicy') : t('savePolicy')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
