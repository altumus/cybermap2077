import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

/** Free vector style — swap later for a custom cyberpunk theme */
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark'

const DEFAULT_CENTER: [number, number] = [-118.2437, 34.0522]
const DEFAULT_ZOOM = 11
const FOCUS_ZOOM = 15

export type MapHandle = {
  flyTo: (lng: number, lat: number, zoom?: number) => void
}

export const Map = forwardRef<MapHandle>(function Map(_, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)

  useImperativeHandle(ref, () => ({
    flyTo(lng, lat, zoom = FOCUS_ZOOM) {
      const map = mapRef.current
      if (!map) return

      if (!markerRef.current) {
        markerRef.current = new maplibregl.Marker({ color: '#fcee0a' })
          .setLngLat([lng, lat])
          .addTo(map)
      } else {
        markerRef.current.setLngLat([lng, lat])
      }

      map.flyTo({
        center: [lng, lat],
        zoom,
        essential: true,
      })
    },
  }))

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
    })

    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      'bottom-right',
    )
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-left',
    )

    mapRef.current = map

    return () => {
      markerRef.current?.remove()
      markerRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="h-full w-full [&_.maplibregl-ctrl-group]:overflow-hidden [&_.maplibregl-ctrl-group]:border [&_.maplibregl-ctrl-group]:border-cp-yellow/30 [&_.maplibregl-ctrl-group]:bg-cp-panel/90 [&_.maplibregl-ctrl-group]:shadow-none [&_.maplibregl-ctrl-group_button]:bg-transparent [&_.maplibregl-ctrl-attrib]:bg-cp-panel/70 [&_.maplibregl-ctrl-attrib]:text-[10px] [&_.maplibregl-ctrl-attrib]:text-cp-muted"
      aria-label="Night City map"
    />
  )
})
