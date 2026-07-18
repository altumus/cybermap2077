import { useState } from 'react'
import { AddressSearch } from './AddressSearch'
import type { GeocodeResult } from '../lib/geocode'
import type { RouteProfile } from '../lib/routing'

export type RoutePickStep = 'idle' | 'origin' | 'destination'
export type RouteUiStatus = 'idle' | 'loading' | 'ready' | 'error'

type RoutePanelProps = {
  step: RoutePickStep
  status: RouteUiStatus
  profile: RouteProfile
  summary: string | null
  originLabel: string
  destinationLabel: string
  onOriginLabelChange: (value: string) => void
  onDestinationLabelChange: (value: string) => void
  onOriginSelect: (result: GeocodeResult) => void
  onDestinationSelect: (result: GeocodeResult) => void
  onStart: () => void
  onClear: () => void
  onProfileChange: (profile: RouteProfile) => void
}

export function RoutePanel({
  step,
  status,
  profile,
  summary,
  originLabel,
  destinationLabel,
  onOriginLabelChange,
  onDestinationLabelChange,
  onOriginSelect,
  onDestinationSelect,
  onStart,
  onClear,
  onProfileChange,
}: RoutePanelProps) {
  const [expanded, setExpanded] = useState(true)

  const hint =
    step === 'origin'
      ? 'Click map or type start address'
      : step === 'destination'
        ? 'Click map or type end address'
        : status === 'loading'
          ? 'Calculating route...'
          : status === 'error'
            ? 'Route unavailable'
            : summary

  const active = step !== 'idle' || status === 'ready' || status === 'loading'
  const collapsedHint =
    status === 'loading'
      ? 'Calculating...'
      : status === 'error'
        ? 'Route unavailable'
        : summary

  return (
    <div className="pointer-events-auto flex w-full max-w-md flex-col border border-cp-cyan/30 bg-cp-panel/90 backdrop-blur-sm md:max-w-sm">
      <div className="flex items-center justify-between gap-2 p-3">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <p className="font-display text-[10px] tracking-[0.25em] text-cp-cyan uppercase">
            Route
          </p>
          {!expanded && collapsedHint && (
            <span
              className={`truncate font-body text-xs ${
                status === 'error' ? 'text-cp-magenta' : 'text-cp-muted'
              }`}
            >
              {collapsedHint}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-label={expanded ? 'Collapse route panel' : 'Expand route panel'}
          className="flex h-7 w-7 shrink-0 items-center justify-center border border-cp-yellow/30 font-display text-xs text-cp-yellow transition-colors hover:bg-cp-yellow/10"
        >
          {expanded ? '−' : '+'}
        </button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-2 border-t border-cp-cyan/20 px-3 pt-2 pb-3">
          <div className="flex justify-end gap-1">
            {(['driving', 'foot'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onProfileChange(option)}
                className={`px-2 py-0.5 font-display text-[10px] tracking-wider uppercase ${
                  profile === option
                    ? 'bg-cp-yellow/20 text-cp-yellow'
                    : 'text-cp-muted hover:text-white'
                }`}
              >
                {option === 'driving' ? 'Drive' : 'Walk'}
              </button>
            ))}
          </div>

          <AddressSearch
            label="A"
            placeholder="Start address..."
            value={originLabel}
            onValueChange={onOriginLabelChange}
            onSelect={onOriginSelect}
            inputId="route-origin"
          />
          <AddressSearch
            label="B"
            placeholder="End address..."
            value={destinationLabel}
            onValueChange={onDestinationLabelChange}
            onSelect={onDestinationSelect}
            inputId="route-destination"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onStart}
              className="flex-1 border border-cp-yellow/40 px-3 py-2 font-display text-xs tracking-[0.2em] text-cp-yellow uppercase transition-colors hover:bg-cp-yellow/10"
            >
              Pick on map
            </button>
            <button
              type="button"
              onClick={onClear}
              disabled={
                !active && status === 'idle' && !originLabel && !destinationLabel
              }
              className="border border-white/15 px-3 py-2 font-display text-xs tracking-[0.2em] text-cp-muted uppercase transition-colors hover:border-cp-magenta/40 hover:text-cp-magenta disabled:opacity-40"
            >
              Clear
            </button>
          </div>

          {hint && (
            <p
              className={`font-body text-xs ${
                status === 'error' ? 'text-cp-magenta' : 'text-cp-muted'
              }`}
            >
              {hint}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
