import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { searchAddresses, type GeocodeResult } from '../lib/geocode'

type AddressSearchProps = {
  onSelect: (result: GeocodeResult) => void
}

export function AddressSearch({ onSelect }: AddressSearchProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      setOpen(false)
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError(null)

      try {
        const next = await searchAddresses(trimmed, controller.signal)
        setResults(next)
        setOpen(true)
        setActiveIndex(-1)
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setResults([])
        setError('Search unavailable')
        setOpen(true)
      } finally {
        setLoading(false)
      }
    }, 350)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query])

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  function choose(result: GeocodeResult) {
    setQuery(result.label)
    setOpen(false)
    setResults([])
    onSelect(result)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) {
      if (event.key === 'Escape') setOpen(false)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1))
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      choose(results[activeIndex])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative w-full max-w-md">
      <label className="sr-only" htmlFor="address-search">
        Search address
      </label>
      <div className="flex items-center border border-cp-yellow/40 bg-cp-panel/90 backdrop-blur-sm">
        <span className="px-3 font-display text-[10px] tracking-[0.25em] text-cp-yellow uppercase">
          Loc
        </span>
        <input
          id="address-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (results.length > 0 || error) setOpen(true)
          }}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
          }
          placeholder="Search address..."
          autoComplete="off"
          className="w-full bg-transparent py-2.5 pr-3 font-body text-sm text-white outline-none placeholder:text-cp-muted"
        />
        {loading && (
          <span className="pr-3 font-display text-[10px] tracking-widest text-cp-cyan uppercase">
            ...
          </span>
        )}
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-auto border border-cp-cyan/30 bg-cp-panel/95 backdrop-blur-sm"
        >
          {error && (
            <li className="px-3 py-2.5 text-sm text-cp-magenta">{error}</li>
          )}
          {!error && results.length === 0 && !loading && (
            <li className="px-3 py-2.5 text-sm text-cp-muted">No results</li>
          )}
          {results.map((result, index) => (
            <li key={result.id} role="option" aria-selected={index === activeIndex}>
              <button
                id={`${listId}-option-${index}`}
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(result)}
                className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                  index === activeIndex
                    ? 'bg-cp-yellow/15 text-cp-yellow'
                    : 'text-white hover:bg-white/5'
                }`}
              >
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
