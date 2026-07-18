import { useEffect } from 'react'
import { AddressSearch } from './components/AddressSearch'
import { LocateButton } from './components/LocateButton'
import { Map } from './components/Map'
import { RoutePanel } from './components/RoutePanel'
import { routeActions } from './flux/actions'
import { startRouteEffects } from './flux/routeEffects'

function App() {
  useEffect(() => startRouteEffects(), [])

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
                routeActions.flyTo({ lng: result.lng, lat: result.lat })
              }}
            />
            <LocateButton
              onLocate={(lng, lat) => {
                routeActions.flyTo({ lng, lat })
              }}
            />
          </div>

          <RoutePanel />
        </div>
      </header>

      <main className="relative flex-1">
        <Map />
      </main>
    </div>
  )
}

export default App
