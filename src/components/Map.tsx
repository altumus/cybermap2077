import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type MutableRefObject,
} from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { registerPoiIcons } from '../lib/poiIcons'
import { emptyPois, fetchPois, type PoiFeatureCollection } from '../lib/pois'
import {
  EMPTY_ROUTE,
  fetchRoute,
  formatDistance,
  formatDuration,
  routeToFeatureCollection,
  type LatLng,
  type RouteProfile,
} from '../lib/routing'

/** Local cyberpunk theme — tiles/fonts still from OpenFreeMap */
const MAP_STYLE = '/styles/cyberpunk.json'

const DEFAULT_CENTER: [number, number] = [-118.2437, 34.0522]
const DEFAULT_ZOOM = 11
const FOCUS_ZOOM = 15
const POI_MIN_ZOOM = 10
const POI_DEBOUNCE_MS = 700
const POI_SOURCE = 'pois'
const POI_ICONS = 'pois-icons'
const POI_LABELS = 'pois-labels'
const ROUTE_SOURCE = 'route'
const ROUTE_LAYER = 'route-line'
const ROUTE_GLOW_LAYER = 'route-glow'

export type RoutePickStep = 'idle' | 'origin' | 'destination'
export type RouteUiStatus = 'idle' | 'loading' | 'ready' | 'error'

export type MapHandle = {
  flyTo: (lng: number, lat: number, zoom?: number) => void
  beginRoutePick: () => void
  clearRoute: () => void
  setRouteProfile: (profile: RouteProfile) => void
  setRouteEndpoint: (
    role: 'origin' | 'destination',
    point: LatLng,
    label?: string,
  ) => void
}

type MapProps = {
  onRouteStateChange?: (state: {
    step: RoutePickStep
    status: RouteUiStatus
    profile: RouteProfile
    summary: string | null
    originLabel: string | null
    destinationLabel: string | null
  }) => void
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

function setRouteData(
  map: maplibregl.Map,
  data: ReturnType<typeof routeToFeatureCollection> | typeof EMPTY_ROUTE,
) {
  const source = map.getSource(ROUTE_SOURCE) as maplibregl.GeoJSONSource | undefined
  source?.setData(data)
}

function createRouteMarkerElement(label: string, color: string): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'cp-route-marker'
  el.style.cssText = `
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #121212;
    border: 2px solid ${color};
    color: ${color};
    font-family: Oxanium, sans-serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.05em;
  `
  el.textContent = label
  return el
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
        0.9,
        14,
        1.15,
        18,
        1.4,
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
      'text-offset': [0, 2],
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

function ensureRouteLayers(map: maplibregl.Map) {
  if (map.getSource(ROUTE_SOURCE)) return

  map.addSource(ROUTE_SOURCE, {
    type: 'geojson',
    data: EMPTY_ROUTE,
  })

  map.addLayer({
    id: ROUTE_GLOW_LAYER,
    type: 'line',
    source: ROUTE_SOURCE,
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
    paint: {
      'line-color': '#00f0ff',
      'line-width': 10,
      'line-opacity': 0.25,
    },
  })

  map.addLayer({
    id: ROUTE_LAYER,
    type: 'line',
    source: ROUTE_SOURCE,
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
    paint: {
      'line-color': '#fcee0a',
      'line-width': 4,
      'line-opacity': 0.95,
    },
  })
}

export const Map = forwardRef<MapHandle, MapProps>(function Map(
  { onRouteStateChange },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const searchMarkerRef = useRef<maplibregl.Marker | null>(null)
  const originMarkerRef = useRef<maplibregl.Marker | null>(null)
  const destinationMarkerRef = useRef<maplibregl.Marker | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const routeAbortRef = useRef<AbortController | null>(null)

  const stepRef = useRef<RoutePickStep>('idle')
  const statusRef = useRef<RouteUiStatus>('idle')
  const profileRef = useRef<RouteProfile>('driving')
  const originRef = useRef<LatLng | null>(null)
  const destinationRef = useRef<LatLng | null>(null)
  const originLabelRef = useRef<string | null>(null)
  const destinationLabelRef = useRef<string | null>(null)
  const summaryRef = useRef<string | null>(null)
  const onRouteStateChangeRef = useRef(onRouteStateChange)
  onRouteStateChangeRef.current = onRouteStateChange

  const [poiStatus, setPoiStatus] = useState<PoiStatus>('zoom-in')

  function emitRouteState() {
    onRouteStateChangeRef.current?.({
      step: stepRef.current,
      status: statusRef.current,
      profile: profileRef.current,
      summary: summaryRef.current,
      originLabel: originLabelRef.current,
      destinationLabel: destinationLabelRef.current,
    })
  }

  function formatPinLabel(point: LatLng): string {
    return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`
  }

  function upsertMarker(
    markerRef: MutableRefObject<maplibregl.Marker | null>,
    point: LatLng,
    label: string,
    color: string,
  ) {
    const map = mapRef.current
    if (!map) return

    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({
        element: createRouteMarkerElement(label, color),
        anchor: 'center',
      })
        .setLngLat([point.lng, point.lat])
        .addTo(map)
    } else {
      markerRef.current.setLngLat([point.lng, point.lat])
    }
  }

  async function calculateRoute() {
    const map = mapRef.current
    const origin = originRef.current
    const destination = destinationRef.current
    if (!map || !origin || !destination) return

    routeAbortRef.current?.abort()
    const controller = new AbortController()
    routeAbortRef.current = controller

    statusRef.current = 'loading'
    summaryRef.current = null
    emitRouteState()

    try {
      const route = await fetchRoute(
        origin,
        destination,
        profileRef.current,
        controller.signal,
      )

      if (controller.signal.aborted) return

      setRouteData(map, routeToFeatureCollection(route.geometry))
      const modeLabel = profileRef.current === 'foot' ? 'Walk' : 'Drive'
      summaryRef.current = `${modeLabel} · ${formatDistance(route.distanceMeters)} · ${formatDuration(route.durationSeconds)}`
      statusRef.current = 'ready'
      stepRef.current = 'idle'
      emitRouteState()

      const bounds = new maplibregl.LngLatBounds(
        [origin.lng, origin.lat],
        [destination.lng, destination.lat],
      )
      for (const coord of route.geometry.coordinates) {
        bounds.extend(coord as [number, number])
      }
      map.fitBounds(bounds, { padding: 80, maxZoom: 16, duration: 800 })
    } catch (error) {
      if (
        controller.signal.aborted ||
        (error as Error).name === 'AbortError'
      ) {
        return
      }
      statusRef.current = 'error'
      summaryRef.current = null
      emitRouteState()
    }
  }

  function setRouteEndpoint(
    role: 'origin' | 'destination',
    point: LatLng,
    label?: string,
  ) {
    const map = mapRef.current
    if (!map) return

    const resolvedLabel = label?.trim() || formatPinLabel(point)

    if (role === 'origin') {
      originRef.current = point
      originLabelRef.current = resolvedLabel
      upsertMarker(originMarkerRef, point, 'A', '#00f0ff')
    } else {
      destinationRef.current = point
      destinationLabelRef.current = resolvedLabel
      upsertMarker(destinationMarkerRef, point, 'B', '#fcee0a')
    }

    summaryRef.current = null
    map.getCanvas().style.removeProperty('cursor')

    if (originRef.current && destinationRef.current) {
      stepRef.current = 'idle'
      void calculateRoute()
      return
    }

    stepRef.current = originRef.current ? 'destination' : 'origin'
    statusRef.current = 'idle'
    emitRouteState()
  }

  function placeRoutePoint(point: LatLng) {
    if (stepRef.current === 'idle') return

    if (stepRef.current === 'origin') {
      setRouteEndpoint('origin', point)
      if (!destinationRef.current) {
        mapRef.current?.getCanvas().style.setProperty('cursor', 'crosshair')
      }
      return
    }

    setRouteEndpoint('destination', point)
  }

  function clearRoute() {
    const map = mapRef.current
    routeAbortRef.current?.abort()
    originRef.current = null
    destinationRef.current = null
    originLabelRef.current = null
    destinationLabelRef.current = null
    stepRef.current = 'idle'
    statusRef.current = 'idle'
    summaryRef.current = null
    originMarkerRef.current?.remove()
    originMarkerRef.current = null
    destinationMarkerRef.current?.remove()
    destinationMarkerRef.current = null
    if (map) setRouteData(map, EMPTY_ROUTE)
    map?.getCanvas().style.removeProperty('cursor')
    emitRouteState()
  }

  useImperativeHandle(ref, () => ({
    flyTo(lng, lat, zoom = FOCUS_ZOOM) {
      const map = mapRef.current
      if (!map) return

      if (!searchMarkerRef.current) {
        searchMarkerRef.current = new maplibregl.Marker({ color: '#fcee0a' })
          .setLngLat([lng, lat])
          .addTo(map)
      } else {
        searchMarkerRef.current.setLngLat([lng, lat])
      }

      map.flyTo({
        center: [lng, lat],
        zoom,
        essential: true,
      })
    },
    beginRoutePick() {
      clearRoute()
      stepRef.current = 'origin'
      statusRef.current = 'idle'
      emitRouteState()
      mapRef.current?.getCanvas().style.setProperty('cursor', 'crosshair')
    },
    clearRoute() {
      clearRoute()
    },
    setRouteProfile(profile) {
      profileRef.current = profile
      emitRouteState()
      if (originRef.current && destinationRef.current) {
        void calculateRoute()
      }
    },
    setRouteEndpoint(role, point, label) {
      setRouteEndpoint(role, point, label)
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
    let requestId = 0

    async function loadPois() {
      if (!map.getSource(POI_SOURCE)) return

      const zoom = map.getZoom()
      if (zoom < POI_MIN_ZOOM) {
        setPoiData(map, emptyPois())
        setPoiStatus('zoom-in')
        return
      }

      const currentRequest = ++requestId
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

        if (currentRequest !== requestId || controller.signal.aborted) return
        setPoiData(map, data)
        setPoiStatus('idle')
      } catch (error) {
        if (
          currentRequest !== requestId ||
          controller.signal.aborted ||
          (error as Error).name === 'AbortError'
        ) {
          return
        }
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
      ensureRouteLayers(map)
      void ensurePoiLayers(map).then(() => {
        schedulePoiLoad()
      })
    })

    map.on('moveend', schedulePoiLoad)

    map.on('mouseenter', POI_ICONS, () => {
      if (stepRef.current === 'idle') {
        map.getCanvas().style.cursor = 'pointer'
      }
    })
    map.on('mouseleave', POI_ICONS, () => {
      if (stepRef.current === 'idle') {
        map.getCanvas().style.cursor = ''
      } else {
        map.getCanvas().style.cursor = 'crosshair'
      }
    })

    map.on('click', POI_ICONS, (event) => {
      const feature = event.features?.[0]
      if (!feature || feature.geometry.type !== 'Point') return

      const coordinates = feature.geometry.coordinates.slice() as [
        number,
        number,
      ]

      if (stepRef.current !== 'idle') {
        event.originalEvent.stopPropagation()
        placeRoutePoint({ lng: coordinates[0], lat: coordinates[1] })
        return
      }

      const props = feature.properties as {
        name?: string
        category?: string
        type?: string
        icon?: string
      }

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

    map.on('click', (event) => {
      if (stepRef.current === 'idle') return
      // Ignore clicks that hit a POI — handled above
      const features = map.queryRenderedFeatures(event.point, {
        layers: map.getLayer(POI_ICONS) ? [POI_ICONS] : [],
      })
      if (features.length > 0) return

      placeRoutePoint({ lng: event.lngLat.lng, lat: event.lngLat.lat })
    })

    mapRef.current = map

    return () => {
      window.clearTimeout(debounceTimer)
      abortRef.current?.abort()
      routeAbortRef.current?.abort()
      popup.remove()
      popupRef.current = null
      searchMarkerRef.current?.remove()
      searchMarkerRef.current = null
      originMarkerRef.current?.remove()
      originMarkerRef.current = null
      destinationMarkerRef.current?.remove()
      destinationMarkerRef.current = null
      map.remove()
      mapRef.current = null
    }
    // placeRoutePoint/clearRoute/calculateRoute close over refs — stable enough for mount-only effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
