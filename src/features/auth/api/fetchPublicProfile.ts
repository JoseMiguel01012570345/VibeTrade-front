import type { PublicUserProfile } from '../Dtos/publicProfileTypes'
import { apiFetch } from '@shared/services/http/apiClient'
import {
  apiErrorTextToUserMessage,
  defaultUnexpectedErrorMessage,
} from '@shared/services/http/apiErrorMessage'

export async function fetchPublicProfileApi(
  userId: string,
): Promise<PublicUserProfile | null> {
  const id = userId.trim()
  if (id.length < 2) return null

  const res = await apiFetch(
    `/api/v1/auth/public-profile/${encodeURIComponent(id)}`,
  )
  if (res.status === 404) return null
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(
      apiErrorTextToUserMessage(t, defaultUnexpectedErrorMessage()),
    )
  }
  return (await res.json()) as PublicUserProfile
}
