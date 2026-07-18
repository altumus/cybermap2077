import { fetchRoute } from '../lib/routing'
import { formatDistance, formatDuration } from '../utils/format'
import { routeActions } from './actions'
import { getRouteState, subscribeRouteStore } from './routeStore'

let started = false
let lastKey = ''
let abortController: AbortController | null = null

function routeKey(
  originLng: number,
  originLat: number,
  destLng: number,
  destLat: number,
  profile: string,
): string {
  return `${originLng},${originLat}|${destLng},${destLat}|${profile}`
}

async function runRouteFetch() {
  const state = getRouteState()
  if (!state.origin || !state.destination) return
  if (state.status !== 'loading') return

  const key = routeKey(
    state.origin.lng,
    state.origin.lat,
    state.destination.lng,
    state.destination.lat,
    state.profile,
  )

  if (key === lastKey && state.routeGeometry) return
  lastKey = key

  abortController?.abort()
  const controller = new AbortController()
  abortController = controller

  try {
    const route = await fetchRoute(
      state.origin,
      state.destination,
      state.profile,
      controller.signal,
    )

    if (controller.signal.aborted) return

    const modeLabel = state.profile === 'foot' ? 'Walk' : 'Drive'
    const summary = `${modeLabel} · ${formatDistance(route.distanceMeters)} · ${formatDuration(route.durationSeconds)}`
    const fitCoordinates: [number, number][] = [
      [state.origin.lng, state.origin.lat],
      [state.destination.lng, state.destination.lat],
      ...route.geometry.coordinates,
    ]

    routeActions.routeReady(route.geometry, summary, fitCoordinates)
  } catch (error) {
    if (
      controller.signal.aborted ||
      (error as Error).name === 'AbortError'
    ) {
      return
    }
    routeActions.routeFailed()
  }
}

export function startRouteEffects(): () => void {
  if (started) return () => {}
  started = true

  const unsubscribe = subscribeRouteStore(() => {
    const state = getRouteState()
    if (state.status === 'loading' && state.origin && state.destination) {
      void runRouteFetch()
    }
    if (state.status === 'idle' && !state.origin && !state.destination) {
      lastKey = ''
    }
  })

  return () => {
    started = false
    abortController?.abort()
    unsubscribe()
  }
}
