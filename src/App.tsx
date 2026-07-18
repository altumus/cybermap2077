import { useRef } from 'react'
import { AddressSearch } from './components/AddressSearch'
import { LocateButton } from './components/LocateButton'
import { Map, type MapHandle } from './components/Map'

function App() {
  const mapRef = useRef<MapHandle>(null)

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

        <div className="pointer-events-auto flex w-full items-start gap-2 md:w-auto md:min-w-[22rem]">
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
      </header>

      <main className="relative flex-1">
        <Map ref={mapRef} />
      </main>
    </div>
  )
}

export default App
