import { apiFetch } from '@shared/services/http/apiClient'
import type { SessionUserJson } from '../Dtos/sessionUserTypes'

export async function fetchAuthSession(): Promise<{ user: SessionUserJson } | null> {
  const res = await apiFetch('/api/v1/auth/session')
  if (!res.ok) return null
  return (await res.json()) as { user: SessionUserJson }
}

export async function postLogout(): Promise<void> {
  await apiFetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {})
}
