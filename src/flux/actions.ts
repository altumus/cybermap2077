import type {
  LatLng,
  LineStringGeometry,
  RouteEndpoint,
  RouteProfile,
} from '../types'
import { dispatch } from './routeStore'

export const routeActions = {
  beginRoutePick() {
    dispatch({ type: 'BEGIN_ROUTE_PICK' })
  },

  clearRoute() {
    dispatch({ type: 'CLEAR_ROUTE' })
  },

  setProfile(profile: RouteProfile) {
    dispatch({ type: 'SET_PROFILE', profile })
  },

  setEndpoint(role: RouteEndpoint, point: LatLng, label?: string) {
    dispatch({ type: 'SET_ENDPOINT', role, point, label })
  },

  setLabel(role: RouteEndpoint, label: string) {
    dispatch({ type: 'SET_LABEL', role, label })
  },

  routeLoading() {
    dispatch({ type: 'ROUTE_LOADING' })
  },

  routeReady(
    geometry: LineStringGeometry,
    summary: string,
    fitCoordinates: [number, number][],
  ) {
    dispatch({ type: 'ROUTE_READY', geometry, summary, fitCoordinates })
  },

  routeFailed() {
    dispatch({ type: 'ROUTE_FAILED' })
  },

  flyTo(point: LatLng, zoom?: number) {
    dispatch({ type: 'FLY_TO', point, zoom })
  },

  cameraIntentCleared() {
    dispatch({ type: 'CAMERA_INTENT_CLEARED' })
  },
}
