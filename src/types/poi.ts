export type PoiIconId =
  | 'food'
  | 'drink'
  | 'clothes'
  | 'shop'
  | 'tourism'
  | 'leisure'
  | 'healthcare'
  | 'office'
  | 'craft'
  | 'default'

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
