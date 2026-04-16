import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useLang } from '@/stores/LangContext'
import type { AttendanceRecord } from '@/api/admin'

interface Props {
  records: AttendanceRecord[]
}

export function AttendanceChart({ records }: Props) {
  const { t } = useLang()

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' })
  })

  const data = last7.map((date) => {
    const dayRecs = records.filter((r) => r.date === date)
    return {
      date: date.slice(5),
      present: dayRecs.filter((r) => ['present', 'late', 'early_leave'].includes(r.status)).length,
      late: dayRecs.filter((r) => r.status === 'late').length,
      absent: dayRecs.filter((r) => r.status === 'absent').length,
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('weeklyTrend')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gPresent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gLate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d97706" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="present" stroke="#059669" fill="url(#gPresent)" strokeWidth={2} />
              <Area type="monotone" dataKey="late" stroke="#d97706" fill="url(#gLate)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
