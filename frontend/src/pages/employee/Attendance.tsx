import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Clock, Play, Square, Coffee, LogIn, LogOut } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/stores/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { request } from '@/api/client'
import { fmtTime, todayStr } from '@/lib/formatters'

interface TodayRecord { id?: string; date: string; checkIn?: string; checkOut?: string; status?: string; breaks?: { start?: string; end?: string }[] }

export default function Attendance() {
  const { session } = useAuth()
  const { toast } = useToast()
  const [record, setRecord] = useState<TodayRecord | null>(null)
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [onBreak, setOnBreak] = useState(false)
  const [now, setNow] = useState(new Date())

  useEffect(() => { const iv = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(iv) }, [])

  const getPos = (): Promise<{ lat: number; lng: number }> =>
    new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (p) => { const loc = { lat: p.coords.latitude, lng: p.coords.longitude }; setPos(loc); resolve(loc) },
        () => reject(new Error('Location required')),
        { enableHighAccuracy: true, timeout: 10000 },
      )
    })

  const loadToday = useCallback(async () => {
    try {
      const recs: TodayRecord[] = await request(`/employee/records?date=${todayStr()}`)
      const today = recs.find((r) => r.date === todayStr())
      setRecord(today || null)
      if (today?.breaks?.length) {
        const last = today.breaks[today.breaks.length - 1]
        setOnBreak(!!last.start && !last.end)
      }
    } catch {}
  }, [])

  useEffect(() => { loadToday() }, [loadToday])

  const checkin = async () => {
    setLoading(true)
    try {
      const loc = await getPos()
      await request('/employee/checkin', 'POST', { checkInLat: loc.lat, checkInLng: loc.lng })
      await loadToday()
      toast('Checked in!', 'success')
    } catch (e: unknown) { toast((e as Error).message, 'error') }
    setLoading(false)
  }

  const checkout = async () => {
    setLoading(true)
    try {
      const loc = await getPos()
      await request('/employee/checkout', 'POST', { checkOutLat: loc.lat, checkOutLng: loc.lng })
      await loadToday()
      toast('Checked out!', 'success')
    } catch (e: unknown) { toast((e as Error).message, 'error') }
    setLoading(false)
  }

  const toggleBreak = async () => {
    setLoading(true)
    try {
      await request('/employee/break', 'POST', { action: onBreak ? 'end' : 'start' })
      await loadToday()
      toast(onBreak ? 'Break ended' : 'Break started', 'info')
    } catch (e: unknown) { toast((e as Error).message, 'error') }
    setLoading(false)
  }

  const hasCheckedIn = !!record?.checkIn
  const hasCheckedOut = !!record?.checkOut

  return (
    <div className="space-y-6">
      <div className="text-center py-6">
        <motion.p
          key={now.toLocaleTimeString()}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          className="text-5xl font-light tracking-tight text-text-primary tabular-nums"
        >
          {now.toLocaleTimeString('en-US', { timeZone: 'Asia/Riyadh', hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </motion.p>
        <p className="text-sm text-text-tertiary mt-2">{now.toLocaleDateString('en-US', { timeZone: 'Asia/Riyadh', weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-4">
          {!hasCheckedIn ? (
            <Button onClick={checkin} disabled={loading} size="lg" className="w-full text-base gap-3">
              <LogIn className="h-5 w-5" /> {loading ? 'Getting location...' : 'Check In'}
            </Button>
          ) : !hasCheckedOut ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-success" /><span className="text-sm text-text-primary">Checked in at {fmtTime(record?.checkIn)}</span></div>
                {record?.status && <Badge status={record.status} />}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={toggleBreak} disabled={loading} variant="secondary" className="gap-2">
                  <Coffee className="h-4 w-4" /> {onBreak ? 'End Break' : 'Break'}
                </Button>
                <Button onClick={checkout} disabled={loading} variant="danger" className="gap-2">
                  <LogOut className="h-4 w-4" /> Check Out
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-text-secondary">Shift completed</p>
              <div className="flex items-center justify-center gap-4 mt-3 text-sm">
                <span className="text-success">{fmtTime(record?.checkIn)}</span>
                <span className="text-text-tertiary">→</span>
                <span className="text-danger">{fmtTime(record?.checkOut)}</span>
              </div>
              {record?.status && <div className="mt-2"><Badge status={record.status} /></div>}
            </div>
          )}
        </CardContent>
      </Card>

      {pos && (
        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <MapPin className="h-3.5 w-3.5" />
          <span>{pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}</span>
        </div>
      )}
    </div>
  )
}
