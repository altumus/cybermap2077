import { useRef, useState } from 'react'
import { AddressSearch } from './components/AddressSearch'
import { LocateButton } from './components/LocateButton'
import {
  Map,
  type MapHandle,
  type RoutePickStep,
  type RouteUiStatus,
} from './components/Map'
import { RoutePanel } from './components/RoutePanel'
import type { RouteProfile } from './lib/routing'

function App() {
  const mapRef = useRef<MapHandle>(null)
  const [routeStep, setRouteStep] = useState<RoutePickStep>('idle')
  const [routeStatus, setRouteStatus] = useState<RouteUiStatus>('idle')
  const [routeProfile, setRouteProfile] = useState<RouteProfile>('driving')
  const [routeSummary, setRouteSummary] = useState<string | null>(null)
  const [originLabel, setOriginLabel] = useState('')
  const [destinationLabel, setDestinationLabel] = useState('')

  return (
    <div className="relative flex h-full min-h-dvh flex-col overflow-hidden">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-4 p-4 md:flex-row md:items-start md:justify-between md:p-6">
        <div className="pointer-events-none">
          <p className="font-display text-xs tracking-[0.35em] text-cp-yellow uppercase">
            Night City
          </p>
          <h1 className="font-display text-2xl font-bold tracking-wide text-white md:text-3xl">
            CYBERMAP<span className="text-cp-yellow">2077</span>
          </h1>
        </div>

        <div className="pointer-events-auto flex w-full flex-col items-stretch gap-3 md:w-auto md:min-w-[22rem]">
          <div className="flex items-start gap-2">
            <AddressSearch
              onSelect={(result) => {
                mapRef.current?.flyTo(result.lng, result.lat)
              }}
            />
            <LocateButton
              onLocate={(lng, lat) => {
                mapRef.current?.flyTo(lng, lat)
              }}
            />
          </div>

          <RoutePanel
            step={routeStep}
            status={routeStatus}
            profile={routeProfile}
            summary={routeSummary}
            originLabel={originLabel}
            destinationLabel={destinationLabel}
            onOriginLabelChange={setOriginLabel}
            onDestinationLabelChange={setDestinationLabel}
            onOriginSelect={(result) => {
              setOriginLabel(result.label)
              mapRef.current?.setRouteEndpoint(
                'origin',
                { lng: result.lng, lat: result.lat },
                result.label,
              )
            }}
            onDestinationSelect={(result) => {
              setDestinationLabel(result.label)
              mapRef.current?.setRouteEndpoint(
                'destination',
                { lng: result.lng, lat: result.lat },
                result.label,
              )
            }}
            onStart={() => {
              mapRef.current?.beginRoutePick()
            }}
            onClear={() => {
              setOriginLabel('')
              setDestinationLabel('')
              mapRef.current?.clearRoute()
            }}
            onProfileChange={(profile) => {
              setRouteProfile(profile)
              mapRef.current?.setRouteProfile(profile)
            }}
          />
        </div>
      </header>

      <main className="relative flex-1">
        <Map
          ref={mapRef}
          onRouteStateChange={(state) => {
            setRouteStep(state.step)
            setRouteStatus(state.status)
            setRouteProfile(state.profile)
            setRouteSummary(state.summary)
            if (state.originLabel !== null) setOriginLabel(state.originLabel)
            if (state.destinationLabel !== null) {
              setDestinationLabel(state.destinationLabel)
            }
            if (state.originLabel === null && state.destinationLabel === null) {
              setOriginLabel('')
              setDestinationLabel('')
            }
          }}
        />
      </main>
    </div>
  )
}

export default App
