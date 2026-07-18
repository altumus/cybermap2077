export type LatLng = {
  lat: number
  lng: number
  source: 'device' | 'ip'
}

function requestDevicePosition(
  options: PositionOptions,
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })
}

async function locateByDevice(): Promise<LatLng> {
  if (!window.isSecureContext) {
    throw Object.assign(new Error('Needs HTTPS or localhost'), { code: -1 })
  }

  if (!navigator.geolocation) {
    throw Object.assign(new Error('Geolocation not supported'), { code: -1 })
  }

  const position = await requestDevicePosition({
    enableHighAccuracy: false,
    timeout: 12000,
    maximumAge: 60_000,
  }).catch(async (firstError: GeolocationPositionError) => {
    if (firstError.code === firstError.PERMISSION_DENIED) {
      throw firstError
    }

    return requestDevicePosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    })
  })

  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    source: 'device',
  }
}

/** Approximate location when OS geolocation has no fix (common on desktop Macs). */
async function locateByIp(): Promise<LatLng> {
  const response = await fetch('https://ipwho.is/')
  if (!response.ok) {
    throw new Error('IP location failed')
  }

  const data = (await response.json()) as {
    success?: boolean
    latitude?: number
    longitude?: number
  }

  if (
    !data.success ||
    typeof data.latitude !== 'number' ||
    typeof data.longitude !== 'number'
  ) {
    throw new Error('IP location unavailable')
  }

  return {
    lat: data.latitude,
    lng: data.longitude,
    source: 'ip',
  }
}

function isPermissionDenied(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: number }).code === 1
  )
}

export async function locateUser(): Promise<LatLng> {
  try {
    return await locateByDevice()
  } catch (error) {
    // User explicitly denied — don't silently approximate
    if (isPermissionDenied(error)) {
      throw error
    }

    return locateByIp()
  }
}

export function locateErrorMessage(error: unknown): string {
  if (!window.isSecureContext) return 'Needs HTTPS or localhost'
  if (!navigator.geolocation) return 'Geolocation not supported'
  if (isPermissionDenied(error)) return 'Location permission denied'
  return 'Could not determine location'
}
