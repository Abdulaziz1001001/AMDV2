import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useData } from '@/stores/DataContext'
import { useToast } from '@/components/ui/Toast'
import { updateWorkPolicy } from '@/api/admin'
import { cn } from '@/lib/cn'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function WorkCalendar() {
  const { workPolicy, sync } = useData()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [tz, setTz] = useState(workPolicy?.timeZone || 'Asia/Riyadh')
  const [grace, setGrace] = useState(String(workPolicy?.lateGraceMinutes ?? 15))
  const [weekends, setWeekends] = useState<number[]>(workPolicy?.defaultWeekendDays ?? [5, 6])

  const toggleWeekend = (d: number) => setWeekends((w) => w.includes(d) ? w.filter((x) => x !== d) : [...w, d])

  const save = async () => {
    setSaving(true)
    try {
      await updateWorkPolicy({ timeZone: tz, lateGraceMinutes: Number(grace), defaultWeekendDays: weekends })
      await sync()
      toast('Policy saved', 'success')
    } catch (e: unknown) { toast((e as Error).message, 'error') }
    setSaving(false)
  }

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = now.getDate()
  const holidays = (workPolicy?.companyHolidays || []).map((h) => h.date)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>{now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center">
            {DAYS.map((d) => <div key={d} className="text-xs font-medium text-text-tertiary py-2">{d}</div>)}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dow = new Date(year, month, day).getDay()
              const isWeekend = weekends.includes(dow)
              const isHoliday = holidays.includes(dateStr)
              const isToday = day === today
              return (
                <div key={day} className={cn(
                  'h-10 flex items-center justify-center rounded-lg text-sm transition-colors',
                  isToday && 'ring-2 ring-accent font-semibold',
                  isHoliday ? 'bg-danger-soft text-danger' : isWeekend ? 'bg-warning-soft text-warning' : 'text-text-primary hover:bg-surface-raised',
                )}>{day}</div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Work Policy Settings</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div><label className="text-xs font-medium text-text-secondary block mb-1">Time Zone</label><Input value={tz} onChange={(e) => setTz(e.target.value)} /></div>
            <div><label className="text-xs font-medium text-text-secondary block mb-1">Late Grace (min)</label><Input type="number" value={grace} onChange={(e) => setGrace(e.target.value)} /></div>
          </div>
          <div className="mb-6">
            <label className="text-xs font-medium text-text-secondary block mb-2">Weekend Days</label>
            <div className="flex gap-2">{DAYS.map((d, i) => (
              <button key={i} onClick={() => toggleWeekend(i)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors', weekends.includes(i) ? 'bg-accent text-white border-accent' : 'border-border text-text-secondary hover:bg-surface-raised')}>{d}</button>
            ))}</div>
          </div>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Policy'}</Button>
        </CardContent>
      </Card>
    </div>
  )
}
