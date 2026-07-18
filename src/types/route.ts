import type { LatLng, LineStringGeometry } from './geo'

export type RouteProfile = 'driving' | 'foot'

export type RoutePickStep = 'idle' | 'origin' | 'destination'

export type RouteUiStatus = 'idle' | 'loading' | 'ready' | 'error'

export type RouteEndpoint = 'origin' | 'destination'

export type CameraIntent =
  | { type: 'flyTo'; point: LatLng; zoom?: number }
  | {
      type: 'fitBounds'
      coordinates: [number, number][]
      padding?: number
      maxZoom?: number
    }

export type RouteState = {
  step: RoutePickStep
  status: RouteUiStatus
  profile: RouteProfile
  origin: LatLng | null
  destination: LatLng | null
  originLabel: string
  destinationLabel: string
  summary: string | null
  routeGeometry: LineStringGeometry | null
  cameraIntent: CameraIntent | null
}

export type RouteAction =
  | { type: 'BEGIN_ROUTE_PICK' }
  | { type: 'CLEAR_ROUTE' }
  | { type: 'SET_PROFILE'; profile: RouteProfile }
  | {
      type: 'SET_ENDPOINT'
      role: RouteEndpoint
      point: LatLng
      label?: string
    }
  | { type: 'SET_LABEL'; role: RouteEndpoint; label: string }
  | { type: 'ROUTE_LOADING' }
  | {
      type: 'ROUTE_READY'
      geometry: LineStringGeometry
      summary: string
      fitCoordinates: [number, number][]
    }
  | { type: 'ROUTE_FAILED' }
  | { type: 'FLY_TO'; point: LatLng; zoom?: number }
  | { type: 'CAMERA_INTENT_CLEARED' }
