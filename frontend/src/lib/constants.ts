/** Preset reasons for same-day early checkout (employee portal). */
export const EARLY_LEAVE_REASONS = [
  'Medical or dental appointment',
  'Family emergency',
  'Childcare or school pickup',
  'Government or bank appointment',
  'Approved personal errand',
  'Transportation issue (vehicle or driver)',
  'Not feeling well — leaving early',
  'Religious obligation',
  'Urgent home maintenance (utilities, safety)',
  'Prior commitment approved by supervisor',
] as const

export const LEAVE_TYPES = [
  'Sick Leave',
  'Annual Leave',
  'Unpaid Leave',
  'Emergency Leave',
  'Maternity/Paternity Leave',
  'Bereavement Leave',
  'Study Leave',
  'Hajj/Umrah Leave',
  'Marriage Leave',
  'Work Injury',
] as const

export const STATUS_MAP = {
  present: { label: 'Present', labelAr: 'حاضر', color: 'success' },
  late: { label: 'Late', labelAr: 'متأخر', color: 'warning' },
  absent: { label: 'Absent', labelAr: 'غائب', color: 'danger' },
  early_leave: { label: 'Early Leave', labelAr: 'استئذان', color: 'warning' },
  approved: { label: 'Approved', labelAr: 'مقبول', color: 'success' },
  rejected: { label: 'Rejected', labelAr: 'مرفوض', color: 'danger' },
  pending: { label: 'Pending', labelAr: 'معلق', color: 'warning' },
  declined: { label: 'Declined', labelAr: 'مرفوض', color: 'danger' },
  supervisor_approved: { label: 'Supervisor OK', labelAr: 'موافقة المشرف', color: 'warning' },
  hr_approved: { label: 'HR OK', labelAr: 'موافقة HR', color: 'success' },
  open: { label: 'Open', labelAr: 'مفتوح', color: 'danger' },
  investigating: { label: 'Investigating', labelAr: 'قيد التحقيق', color: 'warning' },
  resolved: { label: 'Resolved', labelAr: 'تم الحل', color: 'success' },
  closed: { label: 'Closed', labelAr: 'مغلق', color: 'muted' },
} as const

export type StatusKey = keyof typeof STATUS_MAP

export const SEVERITY_MAP = {
  low: { label: 'Low', labelAr: 'منخفض', color: 'text-text-secondary' },
  medium: { label: 'Medium', labelAr: 'متوسط', color: 'text-warning' },
  high: { label: 'High', labelAr: 'عالي', color: 'text-danger' },
  critical: { label: 'Critical', labelAr: 'حرج', color: 'text-danger' },
} as const
