function App() {
  return (
    <div className="relative flex h-full min-h-dvh flex-col overflow-hidden">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4 md:p-6">
        <div>
          <p className="font-display text-xs tracking-[0.35em] text-cp-yellow uppercase">
            Night City
          </p>
          <h1 className="font-display text-2xl font-bold tracking-wide text-white md:text-3xl">
            CYBERMAP<span className="text-cp-yellow">2077</span>
          </h1>
        </div>
        <p className="font-display text-[10px] tracking-[0.25em] text-cp-cyan uppercase md:text-xs">
          System online
        </p>
      </header>

      <main className="relative flex-1">
        {/* Map container — Leaflet / MapLibre goes here */}
        <div
          id="map"
          className="h-full w-full bg-cp-dark"
          aria-label="Night City map"
        >
          <div className="flex h-full items-center justify-center">
            <div className="border border-cp-yellow/40 bg-cp-panel/80 px-8 py-6 text-center backdrop-blur-sm">
              <p className="font-display text-sm tracking-[0.3em] text-cp-yellow uppercase">
                Map layer
              </p>
              <p className="mt-2 text-sm text-cp-muted">
                Ready for map integration
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
