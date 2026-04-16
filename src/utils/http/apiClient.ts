import { getSessionToken } from './sessionToken'

/** Cliente HTTP con cabecera de zona horaria (flow-ui) y Bearer si hay sesión. */
export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
  const base = apiBase ? apiBase.replace(/\/+$/, '') : ''

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC'
  const headers = new Headers(init?.headers)
  headers.set('X-Timezone', timeZone)
  const token = getSessionToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  // Never set Content-Type for FormData: the runtime must send multipart boundary.
  const body = init?.body
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  if (body != null && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const url = base && !/^https?:\/\//i.test(input) ? `${base}${input.startsWith('/') ? '' : '/'}${input}` : input
  return fetch(url, { ...init, headers })
}
