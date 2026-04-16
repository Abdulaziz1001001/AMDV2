import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
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
  const { lang, toggle: toggleLang } = useLang()
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
      toast('Settings saved', 'success')
    } catch (e: unknown) { toast((e as Error).message, 'error') }
    setSaving(false)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div><p className="text-sm font-medium text-text-primary">Theme</p><p className="text-xs text-text-tertiary">Current: {theme}</p></div>
            <Button variant="secondary" size="sm" onClick={toggleTheme}>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</Button>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-border-subtle">
            <div><p className="text-sm font-medium text-text-primary">Language</p><p className="text-xs text-text-tertiary">Current: {lang === 'ar' ? 'العربية' : 'English'}</p></div>
            <Button variant="secondary" size="sm" onClick={toggleLang}>{lang === 'en' ? 'العربية' : 'English'}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Leave & Overtime</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-medium text-text-secondary block mb-1">Annual Leave Days</label><Input type="number" value={annualLeave} onChange={(e) => setAnnualLeave(e.target.value)} /></div>
            <div><label className="text-xs font-medium text-text-secondary block mb-1">Overtime Rate Multiplier</label><Input type="number" step="0.1" value={otRate} onChange={(e) => setOtRate(e.target.value)} /></div>
            <div><label className="text-xs font-medium text-text-secondary block mb-1">Max Break (min)</label><Input type="number" value={maxBreak} onChange={(e) => setMaxBreak(e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Leave Accrual</CardTitle></CardHeader>
        <CardContent>
          <label className="flex items-center gap-2 mb-4 cursor-pointer">
            <input type="checkbox" checked={accrualEnabled} onChange={(e) => setAccrualEnabled(e.target.checked)} className="h-4 w-4 rounded border-border accent-accent" />
            <span className="text-sm text-text-primary">Enable monthly accrual</span>
          </label>
          {accrualEnabled && (
            <div><label className="text-xs font-medium text-text-secondary block mb-1">Monthly Rate (days)</label><Input type="number" step="0.5" value={accrualRate} onChange={(e) => setAccrualRate(e.target.value)} className="max-w-40" /></div>
          )}
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</Button>
    </div>
  )
}
