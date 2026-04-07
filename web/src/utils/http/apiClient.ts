import { getSessionToken } from './sessionToken'

/** Cliente HTTP con cabecera de zona horaria (flow-ui) y Bearer si hay sesión. */
export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC'
  const headers = new Headers(init?.headers)
  headers.set('X-Timezone', timeZone)
  const token = getSessionToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init?.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(input, { ...init, headers })
}
