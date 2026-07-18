import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

/** Free vector style — swap later for a custom cyberpunk theme */
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark'

const DEFAULT_CENTER: [number, number] = [-118.2437, 34.0522] // Los Angeles / Night City vibe
const DEFAULT_ZOOM = 11

export function Map() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

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
}
