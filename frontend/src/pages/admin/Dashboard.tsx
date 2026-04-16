import { useEffect, useState, useMemo } from 'react'
import { Users, UserCheck, Clock, UserX, ArrowRightLeft, Timer, AlertTriangle } from 'lucide-react'
import { type ColumnDef } from '@tanstack/react-table'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { AttendanceChart } from '@/components/charts/AttendanceChart'
import { useData } from '@/stores/DataContext'
import { useLang } from '@/stores/LangContext'
import { fetchEarlyCheckouts, fetchOvertimes, fetchSafetyIncidents, type EarlyCheckout, type OvertimeEntry, type SafetyIncident } from '@/api/admin'
import { isWorkingDay } from '@/lib/calendar'
import { todayStr, fmtTime } from '@/lib/formatters'

interface TodayRow {
  id: string
  name: string
  eid: string
  checkIn: string
  checkOut: string
  status: string
}

export default function Dashboard() {
  const { employees, records, groups, workPolicy } = useData()
  const { t } = useLang()
  const [earlyCheckouts, setEarlyCheckouts] = useState<EarlyCheckout[]>([])
  const [overtimes, setOvertimes] = useState<OvertimeEntry[]>([])
  const [incidents, setIncidents] = useState<SafetyIncident[]>([])

  useEffect(() => {
    fetchEarlyCheckouts().then(setEarlyCheckouts).catch(() => {})
    fetchOvertimes().then(setOvertimes).catch(() => {})
    fetchSafetyIncidents().then(setIncidents).catch(() => {})
  }, [])

  const today = todayStr()
  const active = employees.filter((e) => e.active)
  const expected = active.filter((e) => isWorkingDay(today, e.groupId, groups, workPolicy))
  const todayRecs = records.filter((r) => r.date === today)
  const present = todayRecs.filter((r) => ['present', 'late', 'early_leave'].includes(r.status)).length
  const late = todayRecs.filter((r) => r.status === 'late').length
  const absent = expected.length - present

  const pendingEC = earlyCheckouts.filter((e) => e.status === 'pending').length
  const pendingOT = overtimes.filter((o) => o.status === 'pending').length
  const openInc = incidents.filter((i) => i.status === 'open' || i.status === 'investigating').length

  const todayRows = useMemo<TodayRow[]>(() => {
    return todayRecs.map((r) => {
      const emp = employees.find((e) => e.id === r.employeeId)
      return {
        id: r.id,
        name: emp?.name || 'Unknown',
        eid: emp?.eid || '—',
        checkIn: fmtTime(r.checkIn),
        checkOut: fmtTime(r.checkOut),
        status: r.status,
      }
    })
  }, [todayRecs, employees])

  const columns: ColumnDef<TodayRow, unknown>[] = [
    { accessorKey: 'eid', header: 'ID', size: 60 },
    { accessorKey: 'name', header: t('name') },
    { accessorKey: 'checkIn', header: t('checkIn') },
    { accessorKey: 'checkOut', header: t('checkOut') },
    {
      accessorKey: 'status',
      header: t('status'),
      cell: ({ getValue }) => <Badge status={getValue() as string} />,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('totalEmployees')} value={active.length} icon={Users} color="accent" />
        <StatCard label={t('presentToday')} value={present} icon={UserCheck} color="success" />
        <StatCard label={t('lateToday')} value={late} icon={Clock} color="warning" />
        <StatCard label={t('absentToday')} value={absent < 0 ? 0 : absent} icon={UserX} color="danger" />
      </div>

      {/* Action widgets */}
      {(pendingEC > 0 || pendingOT > 0 || openInc > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {pendingEC > 0 && (
            <StatCard label={t('earlyCheckouts')} value={pendingEC} icon={ArrowRightLeft} color="warning" />
          )}
          {pendingOT > 0 && (
            <StatCard label={t('pendingOvertime')} value={pendingOT} icon={Timer} color="accent" />
          )}
          {openInc > 0 && (
            <StatCard label={t('openIncidents')} value={openInc} icon={AlertTriangle} color="danger" />
          )}
        </div>
      )}

      {/* Chart + Table */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AttendanceChart records={records} />

        <Card>
          <CardHeader>
            <CardTitle>{t('todayAttendance')}</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={todayRows} searchColumn="name" searchPlaceholder={`${t('search')}...`} pageSize={8} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
