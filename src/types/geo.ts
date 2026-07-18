export type LatLng = {
  lng: number
  lat: number
}

export type LineStringGeometry = {
  type: 'LineString'
  coordinates: [number, number][]
}

export type BBox = {
  south: number
  west: number
  north: number
  east: number
}

export type GeocodeResult = {
  id: string
  label: string
  lat: number
  lng: number
}
