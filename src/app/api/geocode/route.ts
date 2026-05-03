import { NextRequest, NextResponse } from 'next/server'

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'

/** Proxy OSM Nominatim with a proper User-Agent (required by usage policy). */
export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q')?.trim()
    if (!q || q.length < 3) {
      return NextResponse.json({ error: 'Query must be at least 3 characters' }, { status: 400 })
    }

    const url = new URL(NOMINATIM)
    url.searchParams.set('format', 'json')
    url.searchParams.set('q', q)
    url.searchParams.set('limit', '8')

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'SoCalOffroaders-HostRunWizard/1.0 (+https://socaloffroaders.org)',
        'Accept-Language': 'en',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Geocoder unavailable' }, { status: 502 })
    }

    const raw = (await res.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>
    const results = raw
      .map((r) => {
        const lat = parseFloat(String(r.lat ?? ''))
        const lng = parseFloat(String(r.lon ?? ''))
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
        return {
          lat,
          lng,
          label: String(r.display_name ?? '').trim() || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        }
      })
      .filter(Boolean) as { lat: number; lng: number; label: string }[]

    return NextResponse.json({ results })
  } catch (e) {
    console.error('Geocode error:', e)
    return NextResponse.json({ error: 'Geocode failed' }, { status: 500 })
  }
}
