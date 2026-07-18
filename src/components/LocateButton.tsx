import { useState } from 'react'
import { locateErrorMessage, locateUser } from '../lib/locate'

type LocateButtonProps = {
  onLocate: (lng: number, lat: number) => void
}

type LocateStatus = 'idle' | 'loading' | 'error'

export function LocateButton({ onLocate }: LocateButtonProps) {
  const [status, setStatus] = useState<LocateStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function locate() {
    setErrorMessage(null)
    setStatus('loading')

    try {
      const position = await locateUser()
      setStatus('idle')
      onLocate(position.lng, position.lat)
    } catch (error) {
      setStatus('error')
      setErrorMessage(locateErrorMessage(error))
      window.setTimeout(() => {
        setStatus('idle')
        setErrorMessage(null)
      }, 4000)
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => {
          void locate()
        }}
        disabled={status === 'loading'}
        title={errorMessage ?? 'Go to current location'}
        aria-label="Go to current location"
        className="flex h-[42px] w-[42px] items-center justify-center border border-cp-yellow/40 bg-cp-panel/90 text-cp-yellow backdrop-blur-sm transition-colors hover:bg-cp-yellow/10 disabled:opacity-60"
      >
        {status === 'loading' ? (
          <span className="font-display text-xs tracking-widest">...</span>
        ) : status === 'error' ? (
          <span className="font-display text-base font-bold text-cp-magenta">
            !
          </span>
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
          </svg>
        )}
      </button>

      {errorMessage && (
        <p
          role="alert"
          className="absolute top-full right-0 z-20 mt-2 w-56 border border-cp-magenta/40 bg-cp-panel/95 px-2.5 py-2 font-body text-xs text-cp-magenta backdrop-blur-sm"
        >
          {errorMessage}
        </p>
      )}
    </div>
  )
}
