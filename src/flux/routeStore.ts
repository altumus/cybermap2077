import type { RouteAction, RouteState } from '../types'
import { formatPinLabel } from '../utils/format'

const initialState: RouteState = {
  step: 'idle',
  status: 'idle',
  profile: 'driving',
  origin: null,
  destination: null,
  originLabel: '',
  destinationLabel: '',
  summary: null,
  routeGeometry: null,
  cameraIntent: null,
}

function reduce(state: RouteState, action: RouteAction): RouteState {
  switch (action.type) {
    case 'BEGIN_ROUTE_PICK':
      return {
        ...initialState,
        profile: state.profile,
        step: 'origin',
      }

    case 'CLEAR_ROUTE':
      return {
        ...initialState,
        profile: state.profile,
      }

    case 'SET_PROFILE':
      return {
        ...state,
        profile: action.profile,
        summary: null,
        status:
          state.origin && state.destination ? 'loading' : state.status,
        routeGeometry:
          state.origin && state.destination ? null : state.routeGeometry,
      }

    case 'SET_LABEL':
      return action.role === 'origin'
        ? { ...state, originLabel: action.label }
        : { ...state, destinationLabel: action.label }

    case 'SET_ENDPOINT': {
      const label = action.label?.trim() || formatPinLabel(action.point)
      const next: RouteState = {
        ...state,
        summary: null,
        routeGeometry: null,
        ...(action.role === 'origin'
          ? { origin: action.point, originLabel: label }
          : { destination: action.point, destinationLabel: label }),
      }

      const hasBoth = Boolean(next.origin && next.destination)
      if (hasBoth) {
        return {
          ...next,
          step: 'idle',
          status: 'loading',
        }
      }

      return {
        ...next,
        step: next.origin ? 'destination' : 'origin',
        status: 'idle',
      }
    }

    case 'ROUTE_LOADING':
      return {
        ...state,
        status: 'loading',
        summary: null,
      }

    case 'ROUTE_READY':
      return {
        ...state,
        status: 'ready',
        step: 'idle',
        summary: action.summary,
        routeGeometry: action.geometry,
        cameraIntent: {
          type: 'fitBounds',
          coordinates: action.fitCoordinates,
          padding: 80,
          maxZoom: 16,
        },
      }

    case 'ROUTE_FAILED':
      return {
        ...state,
        status: 'error',
        summary: null,
        routeGeometry: null,
      }

    case 'FLY_TO':
      return {
        ...state,
        cameraIntent: {
          type: 'flyTo',
          point: action.point,
          zoom: action.zoom,
        },
      }

    case 'CAMERA_INTENT_CLEARED':
      return {
        ...state,
        cameraIntent: null,
      }

    default:
      return state
  }
}

type Listener = () => void

let state = initialState
const listeners = new Set<Listener>()

export function getRouteState(): RouteState {
  return state
}

export function subscribeRouteStore(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function dispatch(action: RouteAction): void {
  state = reduce(state, action)
  for (const listener of listeners) {
    listener()
  }
}
