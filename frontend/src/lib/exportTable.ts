import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

/** Pre-formatted strings for PDF/Excel (no raw record id) */
export interface AttendanceRecordExportRow {
  empEid: string
  empName: string
  date: string
  checkIn: string
  checkOut: string
  status: string
  notes: string
}

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

export async function downloadAttendanceRecordsPdf(rows: AttendanceRecordExportRow[]): Promise<void> {
  const doc = new jsPDF()
  const logo = await fetchLogoDataUrl()
  const startY = drawHeader(doc, 'Attendance Records', `Exported ${new Date().toLocaleDateString()}`, logo)

  const tableHead = [['ID', 'Name', 'Date', 'In', 'Out', 'Status', 'Notes']]
  const body = rows.map((r) => [r.empEid, r.empName, r.date, r.checkIn, r.checkOut, r.status, r.notes || ''])

  autoTable(doc, {
    startY,
    head: tableHead,
    body,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [66, 66, 66] },
  })

  doc.save(`attendance-records-${new Date().toISOString().slice(0, 10)}.pdf`)
}

export function downloadAttendanceRecordsExcel(rows: AttendanceRecordExportRow[]): void {
  const wb = XLSX.utils.book_new()
  const data = rows.map((r) => ({
    ID: r.empEid,
    Name: r.empName,
    Date: r.date,
    In: r.checkIn,
    Out: r.checkOut,
    Status: r.status,
    Notes: r.notes || '',
  }))
  const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ Note: 'No rows' }])
  XLSX.utils.book_append_sheet(wb, ws, 'Records')
  XLSX.writeFile(wb, `attendance-records-${new Date().toISOString().slice(0, 10)}.xlsx`)
}
