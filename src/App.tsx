import { Map } from './components/Map'

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
        <Map />
      </main>
    </div>
  )
}

export default App
