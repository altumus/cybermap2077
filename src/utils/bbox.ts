import type { BBox } from '../types'

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
