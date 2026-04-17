import { useState, useEffect, useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SlideOver } from '@/components/ui/SlideOver'
import { useData } from '@/stores/DataContext'
import { useAdminNav } from '@/stores/AdminNavContext'
import { useToast } from '@/components/ui/Toast'
import {
  updateLeaveRequest,
  actionEarlyCheckout,
  actionOvertime,
  fetchEarlyCheckouts,
  fetchOvertimes,
  type EarlyCheckout,
  type OvertimeEntry,
  type LeaveRequest,
} from '@/api/admin'
import { fmtDate, fmtTime } from '@/lib/formatters'

type HrSlide =
  | { kind: 'leave'; item: LeaveRequest }
  | { kind: 'ec'; item: EarlyCheckout }
  | { kind: 'ot'; item: OvertimeEntry }

export default function HrManagement() {
  const { leaveRequests, employees, sync } = useData()
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
  const [slide, setSlide] = useState<HrSlide | null>(null)

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

  const closeSlide = () => setSlide(null)

  const handleLeave = async (id: string, status: string) => {
    try {
      await updateLeaveRequest(id, status)
      await sync()
      toast(`Leave ${status}`, 'success')
      closeSlide()
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    }
  }

  const handleEC = async (id: string, status: string) => {
    try {
      await actionEarlyCheckout(id, status)
      setEC(await fetchEarlyCheckouts())
      toast(`Checkout ${status}`, 'success')
      closeSlide()
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    }
  }

  const handleOT = async (id: string, action: 'approved' | 'declined') => {
    try {
      await actionOvertime(id, action)
      setOT(await fetchOvertimes())
      toast(`Overtime ${action}`, 'success')
      closeSlide()
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    }
  }

  const getName = (ref: LeaveRequest['employeeId']) =>
    typeof ref === 'string' ? employees.find((e) => e.id === ref)?.name || '—' : ref?.name || '—'

  const getEmpLabel = (ref: string | { id?: string; name?: string; eid?: string } | undefined) => {
    if (!ref) return '—'
    if (typeof ref === 'string') {
      const e = employees.find((x) => x.id === ref)
      return e ? `${e.name} (${e.eid ?? '—'})` : '—'
    }
    return [ref.name, ref.eid].filter(Boolean).join(' · ') || '—'
  }

  const leaveCols: ColumnDef<LeaveRequest, unknown>[] = [
    { id: 'employee', header: 'Employee', cell: ({ row }) => getName(row.original.employeeId) },
    { accessorKey: 'type', header: 'Type' },
    {
      id: 'period',
      header: 'Period',
      cell: ({ row }) => `${fmtDate(row.original.startDate)} — ${fmtDate(row.original.endDate)}`,
    },
    { accessorKey: 'requestedDays', header: 'Days', size: 56 },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge status={getValue() as string} /> },
    {
      id: 'review',
      header: '',
      size: 88,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-text-secondary"
          onClick={() => setSlide({ kind: 'leave', item: row.original })}
        >
          {row.original.status === 'pending' ? 'Review' : 'View'}
        </Button>
      ),
    },
  ]

  const tabs = [
    { key: 'leaves' as const, label: `Leave Requests (${pendingLeaves.length})` },
    { key: 'ec' as const, label: `Early Checkouts (${earlyCheckouts.filter((e) => e.status === 'pending').length})` },
    { key: 'ot' as const, label: `Overtime (${overtimes.filter((o) => o.status === 'pending').length})` },
  ]

  const slideTitle =
    slide?.kind === 'leave' ? 'Leave request' : slide?.kind === 'ec' ? 'Early checkout' : slide?.kind === 'ot' ? 'Overtime' : ''

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border-subtle">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
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
        <div className="space-y-2">
          {earlyCheckouts
            .filter((e) => e.status === 'pending')
            .map((ec, i) => {
              const hl = pendingEarlyCheckoutId === ec.id
              return (
                <button
                  key={ec.id}
                  id={`ec-row-${ec.id}`}
                  type="button"
                  onClick={() => setSlide({ kind: 'ec', item: ec })}
                  className={`w-full rounded-lg px-4 py-3 text-left transition-colors ${
                    i % 2 === 0 ? 'bg-surface-raised/50' : 'bg-surface/80'
                  } ${hl ? 'ring-1 ring-accent/50 bg-accent-soft/30' : 'hover:bg-surface-raised'}`}
                >
                  <p className="font-medium text-text-primary">{getEmpLabel(ec.employeeId)}</p>
                  <p className="mt-0.5 text-sm text-text-secondary line-clamp-2">{ec.reason}</p>
                  <p className="mt-1 text-xs text-text-tertiary">{fmtTime(ec.checkoutTime)}</p>
                </button>
              )
            })}
        </div>
      )}

      {tab === 'ot' && (
        <div className="space-y-2">
          {overtimes
            .filter((o) => o.status === 'pending')
            .map((ot, i) => {
              const hl = pendingOvertimeId === ot.id
              return (
                <button
                  key={ot.id}
                  id={`ot-row-${ot.id}`}
                  type="button"
                  onClick={() => setSlide({ kind: 'ot', item: ot })}
                  className={`w-full rounded-lg px-4 py-3 text-left transition-colors ${
                    i % 2 === 0 ? 'bg-surface-raised/50' : 'bg-surface/80'
                  } ${hl ? 'ring-1 ring-accent/50 bg-accent-soft/30' : 'hover:bg-surface-raised'}`}
                >
                  <p className="font-medium text-text-primary">{getEmpLabel(ot.employeeId)}</p>
                  <p className="mt-0.5 text-sm text-text-secondary">
                    {ot.extraMinutes} min · {fmtDate(ot.date)}
                  </p>
                  {ot.reason && <p className="mt-1 text-xs text-text-tertiary line-clamp-2">{ot.reason}</p>}
                </button>
              )
            })}
        </div>
      )}

      <SlideOver open={slide !== null} onOpenChange={(o) => !o && closeSlide()} title={slideTitle}>
        {slide?.kind === 'leave' && (
          <div className="space-y-6">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-text-tertiary">Employee</dt>
                <dd className="text-text-primary">{getName(slide.item.employeeId)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-text-tertiary">Type</dt>
                <dd className="text-text-primary">{slide.item.type}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-text-tertiary">Period</dt>
                <dd className="text-text-primary">
                  {fmtDate(slide.item.startDate)} — {fmtDate(slide.item.endDate)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-text-tertiary">Days</dt>
                <dd className="text-text-primary">{slide.item.requestedDays}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-text-tertiary">Status</dt>
                <dd>
                  <Badge status={slide.item.status} />
                </dd>
              </div>
              {slide.item.reason && (
                <div>
                  <dt className="text-xs font-medium text-text-tertiary">Reason</dt>
                  <dd className="text-text-primary whitespace-pre-wrap">{slide.item.reason}</dd>
                </div>
              )}
              {slide.item.attachmentUrl && (
                <div>
                  <dt className="text-xs font-medium text-text-tertiary">Attachment</dt>
                  <dd>
                    <a
                      href={slide.item.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent underline text-sm"
                    >
                      Open link
                    </a>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium text-text-tertiary">Request ID</dt>
                <dd className="font-mono text-xs text-text-secondary">{slide.item.id}</dd>
              </div>
            </dl>
            {slide.item.status === 'pending' && (
              <div className="flex flex-wrap gap-2 border-t border-border-subtle pt-4">
                <Button variant="approval" size="sm" onClick={() => handleLeave(slide.item.id, 'approved')}>
                  Approve
                </Button>
                <Button variant="decline" size="sm" onClick={() => handleLeave(slide.item.id, 'rejected')}>
                  Decline
                </Button>
              </div>
            )}
          </div>
        )}

        {slide?.kind === 'ec' && (
          <div className="space-y-6">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-text-tertiary">Employee</dt>
                <dd className="text-text-primary">{getEmpLabel(slide.item.employeeId)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-text-tertiary">Checkout</dt>
                <dd className="text-text-primary">{fmtTime(slide.item.checkoutTime)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-text-tertiary">Reason</dt>
                <dd className="text-text-primary whitespace-pre-wrap">{slide.item.reason}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-text-tertiary">Status</dt>
                <dd>
                  <Badge status={slide.item.status} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-text-tertiary">ID</dt>
                <dd className="font-mono text-xs text-text-secondary">{slide.item.id}</dd>
              </div>
            </dl>
            {slide.item.status === 'pending' && (
              <div className="flex flex-wrap gap-2 border-t border-border-subtle pt-4">
                <Button variant="approval" size="sm" onClick={() => handleEC(slide.item.id, 'approved')}>
                  Approve
                </Button>
                <Button variant="decline" size="sm" onClick={() => handleEC(slide.item.id, 'rejected')}>
                  Decline
                </Button>
              </div>
            )}
          </div>
        )}

        {slide?.kind === 'ot' && (
          <div className="space-y-6">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-text-tertiary">Employee</dt>
                <dd className="text-text-primary">{getEmpLabel(slide.item.employeeId)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-text-tertiary">Date</dt>
                <dd className="text-text-primary">{fmtDate(slide.item.date)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-text-tertiary">Extra time</dt>
                <dd className="text-text-primary">{slide.item.extraMinutes} minutes</dd>
              </div>
              {slide.item.reason && (
                <div>
                  <dt className="text-xs font-medium text-text-tertiary">Reason</dt>
                  <dd className="text-text-primary whitespace-pre-wrap">{slide.item.reason}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium text-text-tertiary">Status</dt>
                <dd>
                  <Badge status={slide.item.status} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-text-tertiary">ID</dt>
                <dd className="font-mono text-xs text-text-secondary">{slide.item.id}</dd>
              </div>
            </dl>
            {slide.item.status === 'pending' && (
              <div className="flex flex-wrap gap-2 border-t border-border-subtle pt-4">
                <Button variant="approval" size="sm" onClick={() => handleOT(slide.item.id, 'approved')}>
                  Approve
                </Button>
                <Button variant="decline" size="sm" onClick={() => handleOT(slide.item.id, 'declined')}>
                  Decline
                </Button>
              </div>
            )}
          </div>
        )}
      </SlideOver>
    </div>
  )
}
