import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = Number(searchParams.get('lat'))
  const lon = Number(searchParams.get('lon'))

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: 'Valid GPS coordinates are required.' }, { status: 400 })
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('lat', String(lat))
    url.searchParams.set('lon', String(lon))
    url.searchParams.set('zoom', '10')
    url.searchParams.set('addressdetails', '1')

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'KhetMitra/1.0 (farm location lookup)',
        'Accept-Language': 'en',
      },
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'The location service could not identify this area.' }, { status: 502 })
    }

    const data = await response.json()
    const address = data?.address ?? {}
    const village =
      address.village || address.hamlet || address.locality || address.town ||
      address.city || address.municipality || address.suburb || address.neighbourhood || ''
    const district = address.state_district || address.district || address.county || ''

    return NextResponse.json({
      village,
      district,
      displayName: data?.display_name ?? '',
      latitude: lat,
      longitude: lon,
    })
  } catch {
    return NextResponse.json({ error: 'Unable to look up this location right now. Please enter the village and district manually.' }, { status: 502 })
  }
}
