import type { GeocodeResult } from '../types'

type NominatimItem = {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

export async function searchAddresses(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const params = new URLSearchParams({
    q: trimmed,
    format: 'json',
    addressdetails: '0',
    limit: '6',
  })

  const response = await fetch(`${NOMINATIM_URL}?${params}`, {
    signal,
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Address search failed')
  }

  const data = (await response.json()) as NominatimItem[]

  return data.map((item) => ({
    id: String(item.place_id),
    label: item.display_name,
    lat: Number(item.lat),
    lng: Number(item.lon),
  }))
}
