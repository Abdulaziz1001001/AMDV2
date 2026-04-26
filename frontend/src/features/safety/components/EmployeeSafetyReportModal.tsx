import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useState } from 'react'
import { createSafetyIncident } from '@/features/safety/api/safetyApi'
import type { SafetyIncidentPayload } from '@/features/safety/types/safety'

interface EmployeeSafetyReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EmployeeSafetyReportModal({ open, onOpenChange }: EmployeeSafetyReportModalProps) {
  const { toast } = useToast()
  const [safetyForm, setSafetyForm] = useState<SafetyIncidentPayload>({
    description: '',
    severity: 'medium',
    date: new Date().toISOString().split('T')[0],
  })

  const submitSafety = async () => {
    try {
      await createSafetyIncident(safetyForm)
      toast('Incident reported', 'success')
      onOpenChange(false)
      setSafetyForm({
        description: '',
        severity: 'medium',
        date: new Date().toISOString().split('T')[0],
      })
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Report Safety Incident">
      <div className="space-y-4">
        <div><label className="text-xs font-medium text-text-secondary block mb-1">Date</label><Input type="date" value={safetyForm.date} onChange={(e) => setSafetyForm({ ...safetyForm, date: e.target.value })} /></div>
        <div><label className="text-xs font-medium text-text-secondary block mb-1">Severity</label><Select value={safetyForm.severity} onChange={(e) => setSafetyForm({ ...safetyForm, severity: e.target.value as SafetyIncidentPayload['severity'] })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></Select></div>
        <div><label className="text-xs font-medium text-text-secondary block mb-1">Description *</label><textarea value={safetyForm.description} onChange={(e) => setSafetyForm({ ...safetyForm, description: e.target.value })} className="flex w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm min-h-20 focus:outline-none focus:ring-2 focus:ring-accent/30" /></div>
      </div>
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border-subtle"><Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submitSafety}>Report</Button></div>
    </Modal>
  )
}
