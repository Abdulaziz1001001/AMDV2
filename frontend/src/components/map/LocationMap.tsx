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

const pickerIcon = L.divIcon({
  className: 'leaflet-div-icon',
  html: '<div style="width:16px;height:16px;background:#2563eb;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);cursor:grab"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
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
      map.setView([lat, lng], 15)
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
  const zoom = valid ? 15 : 11

  return (
    <div
      className={`h-56 w-full overflow-hidden rounded-lg border border-border-subtle ${className}`}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full [&_.leaflet-container]:h-full [&_.leaflet-container]:min-h-[200px]"
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
                fillOpacity: 0.15,
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
  )
}
