import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { registerPoiIcons } from '../lib/poiIcons'
import { emptyPois, fetchPois, type PoiFeatureCollection } from '../lib/pois'

/** Free vector style — swap later for a custom cyberpunk theme */
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark'

const DEFAULT_CENTER: [number, number] = [-118.2437, 34.0522]
const DEFAULT_ZOOM = 11
const FOCUS_ZOOM = 15
const POI_MIN_ZOOM = 10
const POI_DEBOUNCE_MS = 500
const POI_SOURCE = 'pois'
const POI_ICONS = 'pois-icons'
const POI_LABELS = 'pois-labels'

export type MapHandle = {
  flyTo: (lng: number, lat: number, zoom?: number) => void
}

type PoiStatus = 'idle' | 'loading' | 'zoom-in' | 'error'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function setPoiData(map: maplibregl.Map, data: PoiFeatureCollection) {
  const source = map.getSource(POI_SOURCE) as maplibregl.GeoJSONSource | undefined
  source?.setData(data)
}

async function ensurePoiLayers(map: maplibregl.Map) {
  if (map.getSource(POI_SOURCE)) return

  await registerPoiIcons(map)

  map.addSource(POI_SOURCE, {
    type: 'geojson',
    data: emptyPois(),
  })

  map.addLayer({
    id: POI_ICONS,
    type: 'symbol',
    source: POI_SOURCE,
    layout: {
      'icon-image': ['concat', 'poi-', ['get', 'icon']],
      'icon-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        10,
        0.55,
        14,
        0.75,
        18,
        1,
      ],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  })

  map.addLayer({
    id: POI_LABELS,
    type: 'symbol',
    source: POI_SOURCE,
    minzoom: 15,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Noto Sans Regular'],
      'text-size': 11,
      'text-offset': [0, 1.6],
      'text-anchor': 'top',
      'text-max-width': 10,
      'text-optional': true,
    },
    paint: {
      'text-color': '#fcee0a',
      'text-halo-color': '#0a0a0a',
      'text-halo-width': 1.5,
    },
  })
}

export const Map = forwardRef<MapHandle>(function Map(_, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [poiStatus, setPoiStatus] = useState<PoiStatus>('zoom-in')

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

    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: '260px',
      className: 'cp-popup',
      offset: 12,
    })
    popupRef.current = popup

    let debounceTimer: number | undefined

    async function loadPois() {
      if (!map.getSource(POI_SOURCE)) return

      const zoom = map.getZoom()
      if (zoom < POI_MIN_ZOOM) {
        setPoiData(map, emptyPois())
        setPoiStatus('zoom-in')
        return
      }

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const bounds = map.getBounds()
      setPoiStatus('loading')

      try {
        const data = await fetchPois(
          {
            south: bounds.getSouth(),
            west: bounds.getWest(),
            north: bounds.getNorth(),
            east: bounds.getEast(),
          },
          controller.signal,
        )

        if (controller.signal.aborted) return
        setPoiData(map, data)
        setPoiStatus('idle')
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
        setPoiData(map, emptyPois())
        setPoiStatus('error')
      }
    }

    function schedulePoiLoad() {
      window.clearTimeout(debounceTimer)
      debounceTimer = window.setTimeout(() => {
        void loadPois()
      }, POI_DEBOUNCE_MS)
    }

    map.on('load', () => {
      void ensurePoiLayers(map).then(() => {
        schedulePoiLoad()
      })
    })

    map.on('moveend', schedulePoiLoad)

    map.on('mouseenter', POI_ICONS, () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', POI_ICONS, () => {
      map.getCanvas().style.cursor = ''
    })

    map.on('click', POI_ICONS, (event) => {
      const feature = event.features?.[0]
      if (!feature || feature.geometry.type !== 'Point') return

      const props = feature.properties as {
        name?: string
        category?: string
        type?: string
        icon?: string
      }

      const coordinates = feature.geometry.coordinates.slice() as [
        number,
        number,
      ]
      const name = props.name ?? 'Unknown'
      const category = props.icon ?? props.category ?? 'poi'
      const type = props.type ?? 'unknown'

      popup
        .setLngLat(coordinates)
        .setHTML(
          `<div class="cp-popup-body">
            <p class="cp-popup-kicker">${escapeHtml(category)}</p>
            <p class="cp-popup-title">${escapeHtml(name)}</p>
            <p class="cp-popup-meta">${escapeHtml(type.replaceAll('_', ' '))}</p>
          </div>`,
        )
        .addTo(map)
    })

    mapRef.current = map

    return () => {
      window.clearTimeout(debounceTimer)
      abortRef.current?.abort()
      popup.remove()
      popupRef.current = null
      markerRef.current?.remove()
      markerRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [])

  const statusLabel =
    poiStatus === 'loading'
      ? 'Scanning sector...'
      : poiStatus === 'zoom-in'
        ? 'Zoom in for POI'
        : poiStatus === 'error'
          ? 'POI unavailable'
          : null

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="h-full w-full [&_.maplibregl-ctrl-group]:overflow-hidden [&_.maplibregl-ctrl-group]:border [&_.maplibregl-ctrl-group]:border-cp-yellow/30 [&_.maplibregl-ctrl-group]:bg-cp-panel/90 [&_.maplibregl-ctrl-group]:shadow-none [&_.maplibregl-ctrl-group_button]:bg-transparent [&_.maplibregl-ctrl-attrib]:bg-cp-panel/70 [&_.maplibregl-ctrl-attrib]:text-[10px] [&_.maplibregl-ctrl-attrib]:text-cp-muted"
        aria-label="Night City map"
      />

      {statusLabel && (
        <p
          className={`pointer-events-none absolute bottom-8 left-1/2 z-10 -translate-x-1/2 border px-3 py-1.5 font-display text-[10px] tracking-[0.25em] uppercase backdrop-blur-sm ${
            poiStatus === 'error'
              ? 'border-cp-magenta/40 bg-cp-panel/90 text-cp-magenta'
              : 'border-cp-cyan/40 bg-cp-panel/90 text-cp-cyan'
          }`}
        >
          {statusLabel}
        </p>
      )}
    </div>
  )
})
