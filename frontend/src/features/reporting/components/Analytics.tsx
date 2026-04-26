import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useData } from '@/stores/DataContext'
import { todayStr } from '@/lib/formatters'
import { isWorkingDay } from '@/lib/calendar'

const COLORS = ['#059669', '#d97706', '#dc2626', '#6b7280']

export default function Analytics() {
  const { employees, records, groups, workPolicy } = useData()
  const today = todayStr()
  const active = employees.filter((e) => e.active)
  const expected = active.filter((e) => isWorkingDay(today, e.groupId, groups, workPolicy))
  const todayRecs = records.filter((r) => r.date === today)
  const present = todayRecs.filter((r) => ['present', 'late', 'early_leave'].includes(r.status)).length
  const late = todayRecs.filter((r) => r.status === 'late').length
  const absent = Math.max(0, expected.length - present)
  const earlyLeave = todayRecs.filter((r) => r.status === 'early_leave').length

  const pieData = [
    { name: 'Present', value: present - late },
    { name: 'Late', value: late },
    { name: 'Absent', value: absent },
    { name: 'Early Leave', value: earlyLeave },
  ].filter((d) => d.value > 0)

  const last7 = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i))
      const ds = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' })
      const dayRecs = records.filter((r) => r.date === ds)
      return {
        day: ds.slice(5),
        present: dayRecs.filter((r) => ['present', 'late', 'early_leave'].includes(r.status)).length,
        absent: dayRecs.filter((r) => r.status === 'absent').length,
      }
    })
  }, [records])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle>Today's Distribution</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>7-Day Attendance</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12 }} />
                <Bar dataKey="present" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
