import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/stores/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { request, upload } from '@/api/client'
import { fmtDate } from '@/lib/formatters'
import { LEAVE_TYPES } from '@/lib/constants'
import { Plus, FileText, AlertTriangle, Calendar } from 'lucide-react'

interface Leave { id: string; startDate: string; endDate: string; type: string; status: string; requestedDays: number; reason?: string }

export default function HrTab() {
  const { session } = useAuth()
  const { toast } = useToast()
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [form, setForm] = useState({ startDate: '', endDate: '', type: 'Annual Leave', reason: '' })
  const [safetyOpen, setSafetyOpen] = useState(false)
  const [safetyForm, setSafetyForm] = useState({ description: '', severity: 'medium', date: new Date().toISOString().split('T')[0] })

  const loadLeaves = async () => { try { setLeaves(await request('/hr/leave-requests')) } catch {} }
  useEffect(() => { loadLeaves() }, [])

  const submitLeave = async () => {
    try {
      await request('/hr/leave-request', 'POST', form)
      toast('Leave requested', 'success'); setLeaveOpen(false); loadLeaves()
    } catch (e: unknown) { toast((e as Error).message, 'error') }
  }

  const submitSafety = async () => {
    try {
      await request('/safety', 'POST', safetyForm)
      toast('Incident reported', 'success'); setSafetyOpen(false)
    } catch (e: unknown) { toast((e as Error).message, 'error') }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button onClick={() => setLeaveOpen(true)} size="sm" className="gap-2"><Calendar className="h-4 w-4" /> Leave Request</Button>
        <Button onClick={() => setSafetyOpen(true)} size="sm" variant="secondary" className="gap-2"><AlertTriangle className="h-4 w-4" /> Safety Report</Button>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text-primary">Leave Requests</h3>
        {leaves.length === 0 ? (
          <p className="text-sm text-text-tertiary py-4 text-center">No leave requests yet</p>
        ) : leaves.map((l) => (
          <Card key={l.id}>
            <CardContent className="pt-3 pb-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2"><p className="text-sm font-medium text-text-primary">{l.type}</p><Badge status={l.status} /></div>
                <p className="text-xs text-text-tertiary mt-0.5">{fmtDate(l.startDate)} — {fmtDate(l.endDate)} ({l.requestedDays} days)</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Modal open={leaveOpen} onOpenChange={setLeaveOpen} title="New Leave Request">
        <div className="space-y-4">
          <div><label className="text-xs font-medium text-text-secondary block mb-1">Type</label><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</Select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-text-secondary block mb-1">Start</label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
            <div><label className="text-xs font-medium text-text-secondary block mb-1">End</label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
          </div>
          <div><label className="text-xs font-medium text-text-secondary block mb-1">Reason</label><textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="flex w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm min-h-16 focus:outline-none focus:ring-2 focus:ring-accent/30" /></div>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border-subtle"><Button variant="secondary" onClick={() => setLeaveOpen(false)}>Cancel</Button><Button onClick={submitLeave}>Submit</Button></div>
      </Modal>

      <Modal open={safetyOpen} onOpenChange={setSafetyOpen} title="Report Safety Incident">
        <div className="space-y-4">
          <div><label className="text-xs font-medium text-text-secondary block mb-1">Date</label><Input type="date" value={safetyForm.date} onChange={(e) => setSafetyForm({ ...safetyForm, date: e.target.value })} /></div>
          <div><label className="text-xs font-medium text-text-secondary block mb-1">Severity</label><Select value={safetyForm.severity} onChange={(e) => setSafetyForm({ ...safetyForm, severity: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></Select></div>
          <div><label className="text-xs font-medium text-text-secondary block mb-1">Description *</label><textarea value={safetyForm.description} onChange={(e) => setSafetyForm({ ...safetyForm, description: e.target.value })} className="flex w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm min-h-20 focus:outline-none focus:ring-2 focus:ring-accent/30" /></div>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border-subtle"><Button variant="secondary" onClick={() => setSafetyOpen(false)}>Cancel</Button><Button onClick={submitSafety}>Report</Button></div>
      </Modal>
    </div>
  )
}
