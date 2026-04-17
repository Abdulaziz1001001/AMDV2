import 'leaflet/dist/leaflet.css'
import { Fragment, useEffect, useMemo, useRef } from 'react'
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import type { LatLngExpression } from 'leaflet'

/** Riyadh — default when no coordinates */
export const DEFAULT_MAP_CENTER: LatLngExpression = [24.7136, 46.6753]

/** Default pin when creating a location (admin clicks or drags to the real site) */
export const DEFAULT_PIN = { lat: 24.7136, lng: 46.6753 } as const

export type MapPoint = {
  id: string
  name: string
  lat: number
  lng: number
  radius: number
}

const siteIcon = L.divIcon({
  className: 'leaflet-div-icon',
  html: '<div style="width:14px;height:14px;background:#2563eb;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

const userIcon = L.divIcon({
  className: 'leaflet-div-icon',
  html: '<div style="width:14px;height:14px;background:#16a34a;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

/** Map pin (drop shape) — anchor at bottom tip */
const pickerIcon = L.divIcon({
  className: 'leaflet-div-icon !border-0 !bg-transparent',
  html: `<div style="width:36px;height:42px;margin-left:-18px;margin-top:-42px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.4))">
    <svg width="36" height="42" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 2C7.58 2 4 5.58 4 10c0 6.5 8 14 8 14s8-7.5 8-14c0-4.42-3.58-8-8-8z" fill="#2563eb" stroke="#fff" stroke-width="1.25"/>
      <circle cx="12" cy="10" r="3" fill="#fff"/>
    </svg>
  </div>`,
  iconSize: [36, 42],
  iconAnchor: [18, 42],
})

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  const key = useMemo(() => points.map((p) => `${p[0]},${p[1]}`).join('|'), [points])

  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView(points[0], 15)
      return
    }
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 16 })
  }, [map, key, points])

  return null
}

function MapSizeFix() {
  const map = useMap()
  useEffect(() => {
    const id = requestAnimationFrame(() => map.invalidateSize())
    const t = window.setTimeout(() => map.invalidateSize(), 200)
    return () => {
      cancelAnimationFrame(id)
      window.clearTimeout(t)
    }
  }, [map])
  return null
}

function RecenterFirstValid({
  lat,
  lng,
  valid,
}: {
  lat?: number
  lng?: number
  valid: boolean
}) {
  const map = useMap()
  const didFirst = useRef(false)
  useEffect(() => {
    if (!valid) {
      didFirst.current = false
      return
    }
    if (lat === undefined || lng === undefined) return
    if (!didFirst.current) {
      map.setView([lat, lng], 16)
      didFirst.current = true
    }
  }, [valid, lat, lng, map])
  return null
}

export function LocationMap({
  locations,
  userPosition,
  className = '',
}: {
  locations: MapPoint[]
  userPosition?: { lat: number; lng: number } | null
  className?: string
}) {
  const pointsForFit = useMemo(() => {
    const centers = locations.map((l) => [l.lat, l.lng] as [number, number])
    if (userPosition) centers.push([userPosition.lat, userPosition.lng])
    return centers
  }, [locations, userPosition])

  const initialCenter: LatLngExpression =
    userPosition != null
      ? [userPosition.lat, userPosition.lng]
      : locations[0]
        ? [locations[0].lat, locations[0].lng]
        : DEFAULT_MAP_CENTER

  const initialZoom = pointsForFit.length === 0 ? 11 : 13

  return (
    <div
      className={`h-[min(420px,50vh)] w-full overflow-hidden rounded-lg border border-border-subtle z-0 ${className}`}
    >
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        className="h-full w-full [&_.leaflet-container]:h-full [&_.leaflet-container]:min-h-[280px]"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapSizeFix />
        {pointsForFit.length > 0 && <FitBounds points={pointsForFit} />}
        {locations.map((loc) => (
          <Fragment key={loc.id}>
            <Circle
              center={[loc.lat, loc.lng]}
              radius={loc.radius}
              pathOptions={{
                color: '#2563eb',
                fillColor: '#2563eb',
                fillOpacity: 0.12,
                weight: 2,
              }}
            />
            <Marker position={[loc.lat, loc.lng]} icon={siteIcon}>
              <Popup>{loc.name}</Popup>
            </Marker>
          </Fragment>
        ))}
        {userPosition != null && (
          <Marker position={[userPosition.lat, userPosition.lng]} icon={userIcon}>
            <Popup>You are here</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}

function MapClickHandler({
  onPosition,
}: {
  onPosition: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(e) {
      onPosition(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export function MapPicker({
  lat,
  lng,
  radius,
  onChange,
  className = '',
}: {
  lat?: number
  lng?: number
  radius: number
  onChange: (lat: number, lng: number) => void
  className?: string
}) {
  const valid =
    lat !== undefined &&
    lng !== undefined &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)

  const center: LatLngExpression = valid ? [lat!, lng!] : DEFAULT_MAP_CENTER
  const zoom = valid ? 16 : 11

  return (
    <div className="space-y-2">
      <div
        className={`relative w-full overflow-hidden rounded-xl border border-border-subtle bg-surface-sunken shadow-inner ${className || 'min-h-[280px] h-[min(380px,42vh)]'}`}
      >
        <MapContainer
          center={center}
          zoom={zoom}
          className="h-full min-h-[260px] w-full [&_.leaflet-container]:h-full [&_.leaflet-container]:min-h-[260px] [&_.leaflet-container]:cursor-crosshair [&_.leaflet-grab]:cursor-grab"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapSizeFix />
          <MapClickHandler onPosition={onChange} />
          <RecenterFirstValid lat={lat} lng={lng} valid={valid} />
          {valid && (
            <>
              <Circle
                center={[lat!, lng!]}
                radius={radius}
                pathOptions={{
                  color: '#2563eb',
                  fillColor: '#2563eb',
                  fillOpacity: 0.18,
                  weight: 2,
                }}
              />
              <Marker
                position={[lat!, lng!]}
                draggable
                icon={pickerIcon}
                eventHandlers={{
                  dragend: (e) => {
                    const p = e.target.getLatLng()
                    onChange(p.lat, p.lng)
                  },
                }}
              />
            </>
          )}
        </MapContainer>
      </div>
      <p className="text-xs text-text-tertiary leading-relaxed">
        <span className="font-medium text-text-secondary">Click</span> the map to move the pin, or{' '}
        <span className="font-medium text-text-secondary">drag</span> the pin. Scroll to zoom. The blue circle is
        your geofence — set radius below.
      </p>
    </div>
  )
}
