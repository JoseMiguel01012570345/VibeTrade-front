/**
 * Geocodificación vía Nominatim (OpenStreetMap).
 * @see https://operations.osmfoundation.org/policies/nominatim/ — uso moderado, User-Agent identificable.
 */

const BASE = 'https://nominatim.openstreetmap.org'

const HEADERS: HeadersInit = {
  Accept: 'application/json',
  'Accept-Language': 'es',
  'User-Agent': 'VibeTrade-RouteSheet/1.0 (+https://www.openstreetmap.org/copyright)',
}

function parseCoord(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.replace(/\s/g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  return null
}

export async function nominatimReverse(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<string | null> {
  const url = `${BASE}/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}&format=jsonv2`
  const res = await fetch(url, { signal, headers: HEADERS })
  if (!res.ok) return null
  const j = (await res.json()) as { display_name?: string }
  const d = j.display_name
  return typeof d === 'string' && d.trim() ? d.trim() : null
}

export async function nominatimSearch(
  query: string,
  signal?: AbortSignal,
): Promise<{ lat: number; lng: number; label: string } | null> {
  const q = query.trim()
  if (q.length < 3) return null
  const url = `${BASE}/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=1`
  const res = await fetch(url, { signal, headers: HEADERS })
  if (!res.ok) return null
  const arr = (await res.json()) as Array<{ lat?: string | number; lon?: string | number; display_name?: string }>
  const first = Array.isArray(arr) ? arr[0] : undefined
  if (!first) return null
  const lat = parseCoord(first.lat)
  const lng = parseCoord(first.lon)
  if (lat === null || lng === null) return null
  const label =
    typeof first.display_name === 'string' && first.display_name.trim()
      ? first.display_name.trim()
      : q
  return { lat, lng, label }
}
