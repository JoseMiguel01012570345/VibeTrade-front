import { apiFetch } from '@shared/services/http/apiClient'
import type {
  PatchProfileBody,
  PatchProfileResponseJson,
} from '../Dtos/authApiTypes'
import type { SessionUserJson } from '../Dtos/sessionUserTypes'

export async function patchProfile(body: PatchProfileBody): Promise<SessionUserJson> {
  const res = await apiFetch('/api/v1/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(t || `PATCH profile ${res.status}`)
  }
  const json = (await res.json()) as PatchProfileResponseJson
  return json.user
}
