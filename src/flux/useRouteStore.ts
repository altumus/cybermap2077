import { useSyncExternalStore } from 'react'
import type { RouteState } from '../types'
import { getRouteState, subscribeRouteStore } from './routeStore'

export function useRouteStore(): RouteState
export function useRouteStore<T>(selector: (state: RouteState) => T): T
export function useRouteStore<T>(
  selector?: (state: RouteState) => T,
): RouteState | T {
  return useSyncExternalStore(
    subscribeRouteStore,
    () => (selector ? selector(getRouteState()) : getRouteState()),
    () => (selector ? selector(getRouteState()) : getRouteState()),
  )
}
