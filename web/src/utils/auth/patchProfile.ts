import { apiFetch } from '../http/apiClient'
import type { SessionUserJson } from './sessionUser'

export type PatchProfileBody = {
  name?: string
  email?: string
  instagram?: string
  telegram?: string
  xAccount?: string
  avatarUrl?: string
}

export async function patchProfile(body: PatchProfileBody): Promise<SessionUserJson> {
  const res = await apiFetch('/api/v1/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(t || `PATCH profile ${res.status}`)
  }
  const json = (await res.json()) as { user: SessionUserJson }
  return json.user
}

export async function patchProfileAvatar(avatarUrl: string): Promise<SessionUserJson> {
  return patchProfile({ avatarUrl })
}
