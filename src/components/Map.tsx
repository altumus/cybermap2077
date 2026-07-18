import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { routeActions } from '../flux/actions'
import { getRouteState } from '../flux/routeStore'
import { useRouteStore } from '../flux/useRouteStore'
import { POI_LABEL_BG_ID, registerPoiIcons } from '../lib/poiIcons'
import { emptyPois, fetchPois, PoiCache } from '../lib/pois'
import { EMPTY_ROUTE, routeToFeatureCollection } from '../lib/routing'
import type { BBox, LatLng, PoiFeatureCollection } from '../types'
import { escapeHtml } from '../utils/html'

const MAP_STYLE = '/styles/cyberpunk.json'
const DEFAULT_CENTER: [number, number] = [-118.2437, 34.0522]
const DEFAULT_ZOOM = 11
const FOCUS_ZOOM = 15
const POI_FETCH_MIN_ZOOM = 14
const POI_FADE_OUT_ZOOM = 13
const POI_FADE_IN_ZOOM = 14
const POI_LABEL_HALO = '#182533'
const POI_DEBOUNCE_MS = 900
const POI_SOURCE = 'pois'
const POI_ICONS = 'pois-icons'
const POI_LABELS = 'pois-labels'
const ROUTE_SOURCE = 'route'
const ROUTE_LAYER = 'route-line'
const ROUTE_GLOW_LAYER = 'route-glow'

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

  try {
    await registerPoiIcons(map)
  } catch {
    // Continue even if some icons fail
  }

  map.addSource(POI_SOURCE, {
    type: 'geojson',
    data: emptyPois(),
  })

  const poiFadeOpacity = [
    'interpolate',
    ['linear'],
    ['zoom'],
    POI_FADE_OUT_ZOOM,
    0,
    POI_FADE_IN_ZOOM,
    1,
  ] as unknown as maplibregl.ExpressionSpecification

  map.addLayer({
    id: POI_ICONS,
    type: 'symbol',
    source: POI_SOURCE,
    minzoom: POI_FADE_OUT_ZOOM,
    layout: {
      'icon-image': [
        'concat',
        'poi-',
        ['coalesce', ['get', 'icon'], 'default'],
      ],
      'icon-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        POI_FADE_OUT_ZOOM,
        0.7,
        POI_FADE_IN_ZOOM,
        1.05,
        16,
        1.25,
        18,
        1.4,
      ],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
    paint: {
      'icon-opacity': poiFadeOpacity,
    },
  })

  map.addLayer({
    id: POI_LABELS,
    type: 'symbol',
    source: POI_SOURCE,
    minzoom: POI_FADE_OUT_ZOOM,
    layout: {
      'icon-image': POI_LABEL_BG_ID,
      'icon-text-fit': 'both',
      'icon-text-fit-padding': [4, 7, 4, 7],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'text-field': ['get', 'name'],
      'text-font': ['Noto Sans Regular'],
      'text-size': 11,
      'text-offset': [0, 1.9],
      'text-anchor': 'top',
      'text-max-width': 10,
      'text-optional': true,
      'text-allow-overlap': false,
    },
    paint: {
      'text-color': '#fcee0a',
      'text-halo-color': POI_LABEL_HALO,
      'text-halo-width': 0.5,
      'icon-opacity': poiFadeOpacity,
      'text-opacity': poiFadeOpacity,
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
    layout: { 'line-join': 'round', 'line-cap': 'round' },
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
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': '#fcee0a',
      'line-width': 4,
      'line-opacity': 0.95,
    },
  })
}

function syncMarker(
  map: maplibregl.Map,
  markerRef: { current: maplibregl.Marker | null },
  point: LatLng | null,
  label: string,
  color: string,
) {
  if (!point) {
    markerRef.current?.remove()
    markerRef.current = null
    return
  }

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

export function Map() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const searchMarkerRef = useRef<maplibregl.Marker | null>(null)
  const originMarkerRef = useRef<maplibregl.Marker | null>(null)
  const destinationMarkerRef = useRef<maplibregl.Marker | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const suppressPoiReloadRef = useRef(false)
  const poiCacheRef = useRef(new PoiCache())
  const stepRef = useRef(getRouteState().step)
  const [mapReady, setMapReady] = useState(false)

  const origin = useRouteStore((s) => s.origin)
  const destination = useRouteStore((s) => s.destination)
  const routeGeometry = useRouteStore((s) => s.routeGeometry)
  const step = useRouteStore((s) => s.step)
  const cameraIntent = useRouteStore((s) => s.cameraIntent)

  stepRef.current = step

  // MapLibre init + POI controller
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
    let poisReady = false
    const poiCache = poiCacheRef.current

    function boundsToBBox(): BBox {
      const bounds = map.getBounds()
      return {
        south: bounds.getSouth(),
        west: bounds.getWest(),
        north: bounds.getNorth(),
        east: bounds.getEast(),
      }
    }

    function paintCachedPois(bbox: BBox) {
      const latPad = (bbox.north - bbox.south) * 0.25
      const lngPad = (bbox.east - bbox.west) * 0.25
      setPoiData(
        map,
        poiCache.toCollection({
          south: bbox.south - latPad,
          north: bbox.north + latPad,
          west: bbox.west - lngPad,
          east: bbox.east + lngPad,
        }),
      )
    }

    async function loadPois() {
      if (!poisReady || !map.getSource(POI_SOURCE)) return
      if (suppressPoiReloadRef.current) return

      const zoom = map.getZoom()
      const bbox = boundsToBBox()

      if (zoom < POI_FADE_OUT_ZOOM) {
        if (poiCache.size > 0) {
          poiCache.clear()
          setPoiData(map, emptyPois())
        }
        return
      }

      if (poiCache.size > 0) {
        paintCachedPois(bbox)
      }

      if (zoom < POI_FETCH_MIN_ZOOM) return

      const currentRequest = ++requestId

      try {
        const data = await fetchPois(bbox)
        if (currentRequest !== requestId) return

        if (data.features.length > 0) {
          poiCache.merge(data)
          poiCache.prune(bbox, 2)
        }

        paintCachedPois(bbox)
      } catch {
        if (currentRequest !== requestId) return
        paintCachedPois(bbox)
      }
    }

    function schedulePoiLoad() {
      if (!poisReady || suppressPoiReloadRef.current) return
      window.clearTimeout(debounceTimer)
      debounceTimer = window.setTimeout(() => {
        void loadPois()
      }, POI_DEBOUNCE_MS)
    }

    map.on('load', () => {
      ensureRouteLayers(map)
      void ensurePoiLayers(map).then(() => {
        poisReady = true
        setMapReady(true)
        void loadPois()
      })
    })

    map.on('moveend', schedulePoiLoad)

    map.on('mouseenter', POI_ICONS, () => {
      if (stepRef.current === 'idle') {
        map.getCanvas().style.cursor = 'pointer'
      }
    })
    map.on('mouseleave', POI_ICONS, () => {
      map.getCanvas().style.cursor =
        stepRef.current === 'idle' ? '' : 'crosshair'
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
        const role = stepRef.current === 'origin' ? 'origin' : 'destination'
        const props = feature.properties as { name?: string }
        routeActions.setEndpoint(
          role,
          { lng: coordinates[0], lat: coordinates[1] },
          props.name,
        )
        return
      }

      const props = feature.properties as {
        name?: string
        category?: string
        type?: string
        icon?: string
      }

      popup
        .setLngLat(coordinates)
        .setHTML(
          `<div class="cp-popup-body">
            <p class="cp-popup-kicker">${escapeHtml(props.icon ?? props.category ?? 'poi')}</p>
            <p class="cp-popup-title">${escapeHtml(props.name ?? 'Unknown')}</p>
            <p class="cp-popup-meta">${escapeHtml((props.type ?? 'unknown').replaceAll('_', ' '))}</p>
          </div>`,
        )
        .addTo(map)
    })

    map.on('click', (event) => {
      if (stepRef.current === 'idle') return

      const features = map.queryRenderedFeatures(event.point, {
        layers: map.getLayer(POI_ICONS) ? [POI_ICONS] : [],
      })
      if (features.length > 0) return

      const role = stepRef.current === 'origin' ? 'origin' : 'destination'
      routeActions.setEndpoint(role, {
        lng: event.lngLat.lng,
        lat: event.lngLat.lat,
      })
    })

    mapRef.current = map

    return () => {
      window.clearTimeout(debounceTimer)
      poiCache.clear()
      popup.remove()
      popupRef.current = null
      searchMarkerRef.current?.remove()
      originMarkerRef.current?.remove()
      destinationMarkerRef.current?.remove()
      setMapReady(false)
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Sync route markers + geometry from store
  useEffect(() => {
    if (!mapReady) return
    const map = mapRef.current
    if (!map?.getSource(ROUTE_SOURCE)) return

    syncMarker(map, originMarkerRef, origin, 'A', '#00f0ff')
    syncMarker(map, destinationMarkerRef, destination, 'B', '#fcee0a')

    if (routeGeometry) {
      setRouteData(map, routeToFeatureCollection(routeGeometry))
    } else {
      setRouteData(map, EMPTY_ROUTE)
    }
  }, [mapReady, origin, destination, routeGeometry])

  // Pick-mode cursor
  useEffect(() => {
    if (!mapReady) return
    const map = mapRef.current
    if (!map) return
    map.getCanvas().style.cursor = step === 'idle' ? '' : 'crosshair'
  }, [mapReady, step])

  // Camera intents from store
  useEffect(() => {
    if (!mapReady || !cameraIntent) return
    const map = mapRef.current
    if (!map) return

    if (cameraIntent.type === 'flyTo') {
      const { point, zoom = FOCUS_ZOOM } = cameraIntent

      if (!searchMarkerRef.current) {
        searchMarkerRef.current = new maplibregl.Marker({ color: '#fcee0a' })
          .setLngLat([point.lng, point.lat])
          .addTo(map)
      } else {
        searchMarkerRef.current.setLngLat([point.lng, point.lat])
      }

      map.flyTo({
        center: [point.lng, point.lat],
        zoom,
        essential: true,
      })
    }

    if (cameraIntent.type === 'fitBounds') {
      const bounds = new maplibregl.LngLatBounds()
      for (const coord of cameraIntent.coordinates) {
        bounds.extend(coord as [number, number])
      }
      suppressPoiReloadRef.current = true
      map.fitBounds(bounds, {
        padding: cameraIntent.padding ?? 80,
        maxZoom: cameraIntent.maxZoom ?? 16,
        duration: 800,
      })
      window.setTimeout(() => {
        suppressPoiReloadRef.current = false
      }, 1000)
    }

    routeActions.cameraIntentCleared()
  }, [mapReady, cameraIntent])

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="h-full w-full [&_.maplibregl-ctrl-group]:overflow-hidden [&_.maplibregl-ctrl-group]:border [&_.maplibregl-ctrl-group]:border-cp-yellow/30 [&_.maplibregl-ctrl-group]:bg-cp-panel/90 [&_.maplibregl-ctrl-group]:shadow-none [&_.maplibregl-ctrl-group_button]:bg-transparent [&_.maplibregl-ctrl-attrib]:bg-cp-panel/70 [&_.maplibregl-ctrl-attrib]:text-[10px] [&_.maplibregl-ctrl-attrib]:text-cp-muted"
        aria-label="Night City map"
      />
    </div>
  )
}
