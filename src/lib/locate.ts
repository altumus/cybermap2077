export type LatLng = {
  lat: number
  lng: number
}

export async function locateUser(): Promise<LatLng> {
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
  }
}

export function locateErrorMessage(): string {
  return 'Could not determine location'
}
