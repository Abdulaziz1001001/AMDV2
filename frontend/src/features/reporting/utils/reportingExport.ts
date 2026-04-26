import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import type {
  AttendanceReportDeptRow,
  AttendanceReportEmployeeRow,
  MonthlyAttendanceDetailRow,
} from '@/features/reporting/types/reporting'

type JsPDFWithMeta = jsPDF & { lastAutoTable?: { finalY: number } }

async function fetchLogoDataUrl(): Promise<string | null> {
  try {
    const base = import.meta.env.BASE_URL || '/'
    const path = `${base.replace(/\/?$/, '/') }assets/logo-amd.png`
    const res = await fetch(path)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result as string)
      r.onerror = reject
      r.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function drawHeader(doc: jsPDF, title: string, subtitle: string, logo: string | null): number {
  const pageW = doc.internal.pageSize.getWidth()
  let y = 14
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 14, y, 36, 11)
    } catch {
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('AMD', 14, y + 8)
    }
  } else {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('AMD', 14, y + 8)
  }
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(title, pageW / 2, y + 6, { align: 'center' })
  y += 16
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(subtitle, pageW / 2, y, { align: 'center' })
  return y + 8
}

function fmtRiyadhTime(iso?: string): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Riyadh',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d)
  } catch {
    return iso
  }
}

export function mapAttendanceReportRecordsToDetailRows(
  rows: Array<{
    employeeName: string
    date: string
    checkIn: string
    checkOut: string
    locationName: string
    checkoutLocationName: string
    status: string
    notes: string
  }>,
): MonthlyAttendanceDetailRow[] {
  return rows.map((r) => ({
    employeeName: r.employeeName,
    date: r.date,
    checkInTime: fmtRiyadhTime(r.checkIn),
    checkInLocation: r.locationName || '—',
    checkOutTime: fmtRiyadhTime(r.checkOut),
    checkOutLocation: r.checkoutLocationName || '—',
    status: r.status,
    notes: r.notes || '',
  }))
}

export async function downloadMonthlyAttendanceDetailPdf(
  rows: MonthlyAttendanceDetailRow[],
  month: string,
  year: string,
): Promise<void> {
  const doc = new jsPDF()
  const logo = await fetchLogoDataUrl()
  const subtitle = `Monthly detail · ${month} / ${year}`
  const startY = drawHeader(doc, 'Attendance Detail', subtitle, logo)

  const head = [[
    'Employee',
    'Date',
    'Check-in',
    'Check-in location',
    'Check-out',
    'Check-out location',
    'Status',
    'Notes',
  ]]
  const body = rows.map((r) => [
    r.employeeName,
    r.date,
    r.checkInTime,
    r.checkInLocation,
    r.checkOutTime,
    r.checkOutLocation,
    r.status,
    r.notes || '',
  ])

  autoTable(doc, {
    startY,
    head,
    body: body.length ? body : [['—', '—', '—', '—', '—', '—', '—', 'No rows']],
    styles: { fontSize: 7 },
    headStyles: { fillColor: [66, 66, 66] },
    columnStyles: { 7: { cellWidth: 36 } },
  })

  doc.save(`attendance-detail-${year}-${month}.pdf`)
}

export function downloadMonthlyAttendanceDetailExcel(
  rows: MonthlyAttendanceDetailRow[],
  month: string,
  year: string,
): void {
  const wb = XLSX.utils.book_new()
  const data = rows.map((r) => ({
    'Employee Name': r.employeeName,
    Date: r.date,
    'Check-in Time': r.checkInTime,
    'Check-in Location': r.checkInLocation,
    'Check-out Time': r.checkOutTime,
    'Check-out Location': r.checkOutLocation,
    Status: r.status,
    Notes: r.notes || '',
  }))
  const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ Note: 'No rows' }])
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance')
  XLSX.writeFile(wb, `attendance-detail-${year}-${month}.xlsx`)
}

export async function downloadAttendanceReportPdf(
  employees: AttendanceReportEmployeeRow[],
  departments: AttendanceReportDeptRow[],
  month: string,
  year: string,
): Promise<void> {
  const doc = new jsPDF()
  const logo = await fetchLogoDataUrl()
  const subtitle = `Period: ${month} / ${year}`
  const startY = drawHeader(doc, 'Attendance Report', subtitle, logo)

  const empHead = [['ID', 'Name', 'Department', 'Days', 'Present', 'Late', 'Absent', 'Leave', 'OT Hrs', 'Break Hrs']]
  const empBody = employees.map((r) => [
    r.eid,
    r.name,
    r.department ?? '',
    String(r.totalDays),
    String(r.present),
    String(r.late),
    String(r.absent),
    String(r.onLeave),
    String(r.overtimeHours),
    String(r.totalBreakHours),
  ])

  autoTable(doc, {
    startY,
    head: empHead,
    body: empBody.length ? empBody : [['—', 'No employee rows', '', '', '', '', '', '', '', '']],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [66, 66, 66] },
  })

  let y = (doc as JsPDFWithMeta).lastAutoTable?.finalY ?? startY
  y += 8

  if (departments.length > 0) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Department roll-up', 14, y)
    y += 6

    const deptHead = [['Department', 'Employees', 'Present', 'Late', 'Absent', 'OT Hrs']]
    const deptBody = departments.map((d) => [
      d.department,
      String(d.employees),
      String(d.present),
      String(d.late),
      String(d.absent),
      String(d.overtimeHours),
    ])

    autoTable(doc, {
      startY: y,
      head: deptHead,
      body: deptBody,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 66, 66] },
    })
  }

  doc.save(`attendance-report-${year}-${month}.pdf`)
}

export function downloadAttendanceReportExcel(
  employees: AttendanceReportEmployeeRow[],
  departments: AttendanceReportDeptRow[],
  month: string,
  year: string,
): void {
  const wb = XLSX.utils.book_new()

  const empSheetData = employees.map((r) => ({
    ID: r.eid,
    Name: r.name,
    Department: r.department ?? '',
    Days: r.totalDays,
    Present: r.present,
    Late: r.late,
    Absent: r.absent,
    Leave: r.onLeave,
    'OT Hrs': r.overtimeHours,
    'Break Hrs': r.totalBreakHours,
  }))

  const ws1 = XLSX.utils.json_to_sheet(empSheetData.length ? empSheetData : [{ Note: 'No employee rows' }])
  XLSX.utils.book_append_sheet(wb, ws1, 'Employees')

  if (departments.length > 0) {
    const deptSheetData = departments.map((d) => ({
      Department: d.department,
      Employees: d.employees,
      Present: d.present,
      Late: d.late,
      Absent: d.absent,
      'OT Hrs': d.overtimeHours,
    }))
    const ws2 = XLSX.utils.json_to_sheet(deptSheetData)
    XLSX.utils.book_append_sheet(wb, ws2, 'Department Rollup')
  }

  XLSX.writeFile(wb, `attendance-report-${year}-${month}.xlsx`)
}
