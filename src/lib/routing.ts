import type { LatLng, LineStringGeometry, RouteProfile } from '../types'

export type RouteResult = {
  geometry: LineStringGeometry
  distanceMeters: number
  durationSeconds: number
}

export type RouteFeatureCollection = {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    geometry: LineStringGeometry
    properties: Record<string, never>
  }>
}

type OsrmResponse = {
  code: string
  routes?: Array<{
    distance: number
    duration: number
    geometry: LineStringGeometry
  }>
}

/** FOSSGIS OSRM — separate car/foot graphs. */
const OSRM_ENDPOINTS: Record<RouteProfile, string> = {
  driving: 'https://routing.openstreetmap.de/routed-car/route/v1/driving',
  foot: 'https://routing.openstreetmap.de/routed-foot/route/v1/driving',
}

export const EMPTY_ROUTE: RouteFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
}

export function routeToFeatureCollection(
  geometry: LineStringGeometry,
): RouteFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry,
        properties: {},
      },
    ],
  }
}

export async function fetchRoute(
  origin: LatLng,
  destination: LatLng,
  profile: RouteProfile = 'driving',
  signal?: AbortSignal,
): Promise<RouteResult> {
  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`
  const params = new URLSearchParams({
    overview: 'full',
    geometries: 'geojson',
  })

  const response = await fetch(
    `${OSRM_ENDPOINTS[profile]}/${coordinates}?${params}`,
    { signal },
  )

  if (!response.ok) {
    throw new Error('Route request failed')
  }

  const data = (await response.json()) as OsrmResponse
  const route = data.routes?.[0]

  if (data.code !== 'Ok' || !route?.geometry) {
    throw new Error('No route found')
  }

  return {
    geometry: route.geometry,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  }
}
