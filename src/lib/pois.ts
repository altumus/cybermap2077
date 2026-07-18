import { resolvePoiIcon, type PoiIconId } from './poiIcons'

export type BBox = {
  south: number
  west: number
  north: number
  east: number
}

export type PoiProperties = {
  id: string
  name: string
  category: string
  type: string
  icon: PoiIconId
}

export type PoiFeature = {
  type: 'Feature'
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
  properties: PoiProperties
}

export type PoiFeatureCollection = {
  type: 'FeatureCollection'
  features: PoiFeature[]
}

type OverpassElement = {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

type OverpassResponse = {
  elements?: OverpassElement[]
}

/** Mirrors that allow browser CORS (overpass-api.de returns 406 with Origin). */
const OVERPASS_ENDPOINTS = [
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
]

const POI_KEYS = [
  'amenity',
  'shop',
  'tourism',
  'leisure',
  'office',
  'craft',
  'healthcare',
] as const

const EMPTY: PoiFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
}

/** Cap query area so Overpass doesn't time out on city-wide zooms. */
export function clampBBox(bbox: BBox, maxSpan = 0.12): BBox {
  const latSpan = bbox.north - bbox.south
  const lngSpan = bbox.east - bbox.west
  const latCenter = (bbox.north + bbox.south) / 2
  const lngCenter = (bbox.east + bbox.west) / 2
  const halfLat = Math.min(latSpan, maxSpan) / 2
  const halfLng = Math.min(lngSpan, maxSpan) / 2

  return {
    south: latCenter - halfLat,
    north: latCenter + halfLat,
    west: lngCenter - halfLng,
    east: lngCenter + halfLng,
  }
}

function buildQuery(bbox: BBox): string {
  const { south, west, north, east } = clampBBox(bbox)
  const filters = POI_KEYS.map(
    (key) => `nwr["${key}"]["name"](${south},${west},${north},${east});`,
  ).join('\n')

  return `[out:json][timeout:25];(${filters});out center 250;`
}

function resolveCategory(tags: Record<string, string>): {
  category: string
  type: string
} {
  for (const key of POI_KEYS) {
    const value = tags[key]
    if (value) {
      return { category: key, type: value }
    }
  }
  return { category: 'poi', type: 'unknown' }
}

function toFeature(element: OverpassElement): PoiFeature | null {
  const tags = element.tags
  if (!tags?.name) return null

  const lat = element.lat ?? element.center?.lat
  const lon = element.lon ?? element.center?.lon
  if (lat == null || lon == null) return null

  const { category, type } = resolveCategory(tags)

  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [lon, lat],
    },
    properties: {
      id: `${element.type}/${element.id}`,
      name: tags.name,
      category,
      type,
      icon: resolvePoiIcon(category, type),
    },
  }
}

function toCollection(data: OverpassResponse): PoiFeatureCollection {
  const features: PoiFeature[] = []
  const seen = new Set<string>()

  for (const element of data.elements ?? []) {
    const feature = toFeature(element)
    if (!feature || seen.has(feature.properties.id)) continue
    seen.add(feature.properties.id)
    features.push(feature)
  }

  return {
    type: 'FeatureCollection',
    features,
  }
}

async function queryEndpoint(
  endpoint: string,
  query: string,
  signal?: AbortSignal,
): Promise<PoiFeatureCollection> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
    body: new URLSearchParams({ data: query }),
    signal,
  })

  if (!response.ok) {
    throw new Error(`POI fetch failed (${response.status})`)
  }

  const data = (await response.json()) as OverpassResponse
  return toCollection(data)
}

export async function fetchPois(
  bbox: BBox,
  signal?: AbortSignal,
): Promise<PoiFeatureCollection> {
  const query = buildQuery(bbox)
  let lastError: unknown

  for (const endpoint of OVERPASS_ENDPOINTS) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    try {
      return await queryEndpoint(endpoint, query, signal)
    } catch (error) {
      if (signal?.aborted || (error as Error).name === 'AbortError') {
        throw new DOMException('Aborted', 'AbortError')
      }
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('POI fetch failed')
}

export function emptyPois(): PoiFeatureCollection {
  return EMPTY
}

/** Keeps POIs across pans so empty/failed Overpass responses don't wipe the map. */
export class PoiCache {
  private features = new Map<string, PoiFeature>()

  clear() {
    this.features.clear()
  }

  merge(collection: PoiFeatureCollection) {
    for (const feature of collection.features) {
      this.features.set(feature.properties.id, feature)
    }
  }

  prune(bbox: BBox, padRatio = 1) {
    if (this.features.size === 0) return

    const latPad = (bbox.north - bbox.south) * padRatio
    const lngPad = (bbox.east - bbox.west) * padRatio
    const south = bbox.south - latPad
    const north = bbox.north + latPad
    const west = bbox.west - lngPad
    const east = bbox.east + lngPad

    for (const [id, feature] of this.features) {
      const [lng, lat] = feature.geometry.coordinates
      if (lat < south || lat > north || lng < west || lng > east) {
        this.features.delete(id)
      }
    }
  }

  toCollection(bbox?: BBox): PoiFeatureCollection {
    let features = [...this.features.values()]

    if (bbox) {
      features = features.filter((feature) => {
        const [lng, lat] = feature.geometry.coordinates
        return (
          lat >= bbox.south &&
          lat <= bbox.north &&
          lng >= bbox.west &&
          lng <= bbox.east
        )
      })
    }

    return {
      type: 'FeatureCollection',
      features,
    }
  }

  get size() {
    return this.features.size
  }
}
