import { useState, useEffect, useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { useData } from '@/stores/DataContext'
import { useAdminNav } from '@/stores/AdminNavContext'
import { useToast } from '@/components/ui/Toast'
import { updateLeaveRequest, actionEarlyCheckout, actionOvertime, fetchEarlyCheckouts, fetchOvertimes, type EarlyCheckout, type OvertimeEntry, type LeaveRequest } from '@/api/admin'
import { fmtDate } from '@/lib/formatters'

export default function HrManagement() {
  const { leaveRequests, employees, departments, sync } = useData()
  const {
    pendingHrTab,
    pendingLeaveId,
    pendingEarlyCheckoutId,
    pendingOvertimeId,
    clearPendingHrFocus,
  } = useAdminNav()
  const { toast } = useToast()
  const [earlyCheckouts, setEC] = useState<EarlyCheckout[]>([])
  const [overtimes, setOT] = useState<OvertimeEntry[]>([])
  const [tab, setTab] = useState<'leaves' | 'ec' | 'ot'>('leaves')

  useEffect(() => {
    fetchEarlyCheckouts().then(setEC).catch(() => {})
    fetchOvertimes().then(setOT).catch(() => {})
  }, [])

  useEffect(() => {
    if (pendingHrTab) setTab(pendingHrTab)
  }, [pendingHrTab])

  useEffect(() => {
    if (!pendingLeaveId || tab !== 'leaves') return
    const t = window.setTimeout(() => {
      document.getElementById(`dt-row-${pendingLeaveId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      clearPendingHrFocus()
    }, 250)
    return () => window.clearTimeout(t)
  }, [pendingLeaveId, tab, clearPendingHrFocus])

  useEffect(() => {
    if (!pendingEarlyCheckoutId || tab !== 'ec') return
    const t = window.setTimeout(() => {
      document.getElementById(`ec-row-${pendingEarlyCheckoutId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      clearPendingHrFocus()
    }, 250)
    return () => window.clearTimeout(t)
  }, [pendingEarlyCheckoutId, tab, clearPendingHrFocus])

  useEffect(() => {
    if (!pendingOvertimeId || tab !== 'ot') return
    const t = window.setTimeout(() => {
      document.getElementById(`ot-row-${pendingOvertimeId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      clearPendingHrFocus()
    }, 250)
    return () => window.clearTimeout(t)
  }, [pendingOvertimeId, tab, clearPendingHrFocus])

  const pendingLeaves = useMemo(() => leaveRequests.filter((l) => l.status === 'pending'), [leaveRequests])

  const handleLeave = async (id: string, status: string) => {
    try { await updateLeaveRequest(id, status); await sync(); toast(`Leave ${status}`, 'success') } catch (e: unknown) { toast((e as Error).message, 'error') }
  }
  const handleEC = async (id: string, status: string) => {
    try { await actionEarlyCheckout(id, status); setEC(await fetchEarlyCheckouts()); toast(`Checkout ${status}`, 'success') } catch (e: unknown) { toast((e as Error).message, 'error') }
  }
  const handleOT = async (id: string, action: string) => {
    try { await actionOvertime(id, action); setOT(await fetchOvertimes()); toast(`Overtime ${action}`, 'success') } catch (e: unknown) { toast((e as Error).message, 'error') }
  }

  const getName = (ref: LeaveRequest['employeeId']) => typeof ref === 'string' ? employees.find((e) => e.id === ref)?.name || '—' : ref?.name || '—'

  const leaveCols: ColumnDef<LeaveRequest, unknown>[] = [
    { id: 'employee', header: 'Employee', cell: ({ row }) => getName(row.original.employeeId) },
    { accessorKey: 'type', header: 'Type' },
    { accessorKey: 'requestedDays', header: 'Days', size: 60 },
    { id: 'dates', header: 'Period', cell: ({ row }) => `${fmtDate(row.original.startDate)} — ${fmtDate(row.original.endDate)}` },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge status={getValue() as string} /> },
    { id: 'actions', header: '', cell: ({ row }) => row.original.status === 'pending' ? (
      <div className="flex gap-1"><Button size="sm" onClick={() => handleLeave(row.original.id, 'approved')}>Approve</Button><Button size="sm" variant="danger" onClick={() => handleLeave(row.original.id, 'rejected')}>Reject</Button></div>
    ) : null },
  ]

  const tabs = [
    { key: 'leaves' as const, label: `Leave Requests (${pendingLeaves.length})` },
    { key: 'ec' as const, label: `Early Checkouts (${earlyCheckouts.filter(e => e.status === 'pending').length})` },
    { key: 'ot' as const, label: `Overtime (${overtimes.filter(o => o.status === 'pending').length})` },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border-subtle">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'leaves' && (
        <DataTable
          columns={leaveCols}
          data={leaveRequests}
          searchColumn="type"
          pageSize={10}
          getRowId={(r) => r.id}
          highlightRowId={pendingLeaveId}
        />
      )}
      {tab === 'ec' && (
        <div className="space-y-3">
          {earlyCheckouts.filter(e => e.status === 'pending').map((ec) => {
            const empName = typeof ec.employeeId === 'string' ? employees.find(e => e.id === ec.employeeId)?.name : (ec.employeeId as { name?: string })?.name
            return (
              <Card key={ec.id} id={`ec-row-${ec.id}`} className={pendingEarlyCheckoutId === ec.id ? 'ring-1 ring-accent/50 bg-accent-soft/30' : ''}>
                <CardContent className="pt-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text-primary">{empName || 'Employee'}</p>
                    <p className="text-sm text-text-secondary">{ec.reason}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleEC(ec.id, 'approved')}>Approve</Button>
                    <Button size="sm" variant="danger" onClick={() => handleEC(ec.id, 'rejected')}>Reject</Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      {tab === 'ot' && (
        <div className="space-y-3">
          {overtimes.filter(o => o.status === 'pending').map((ot) => {
            const empName = typeof ot.employeeId === 'string' ? employees.find(e => e.id === ot.employeeId)?.name : (ot.employeeId as { name?: string })?.name
            return (
              <Card key={ot.id} id={`ot-row-${ot.id}`} className={pendingOvertimeId === ot.id ? 'ring-1 ring-accent/50 bg-accent-soft/30' : ''}>
                <CardContent className="pt-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text-primary">{empName || 'Employee'}</p>
                    <p className="text-sm text-text-secondary">{ot.extraMinutes} min — {ot.date}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleOT(ot.id, 'approved')}>Approve</Button>
                    <Button size="sm" variant="danger" onClick={() => handleOT(ot.id, 'declined')}>Decline</Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
