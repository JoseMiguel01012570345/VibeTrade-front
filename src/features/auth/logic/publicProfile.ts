import { useAppStore } from '@features/auth/logic/useAppStore'
import type { PublicUserProfile } from '../Dtos/publicProfileTypes'
import { fetchPublicProfileApi } from '../api/fetchPublicProfile'

const publicProfileInFlight = new Map<
  string,
  Promise<PublicUserProfile | null>
>()

/** Respuesta HTTP recibida (200/404): evita reintentos en bucle si falta avatar en caché. */
const publicProfileHydratedIds = new Set<string>()

export function wasPublicProfileHydrated(userId: string): boolean {
  return publicProfileHydratedIds.has(userId.trim())
}

function markPublicProfileHydrated(userId: string): void {
  const id = userId.trim()
  if (id.length >= 2) publicProfileHydratedIds.add(id)
}

export function mergePublicProfileIntoAppStore(p: PublicUserProfile): void {
  useAppStore.setState((s) => ({
    profileTrustScores: {
      ...s.profileTrustScores,
      [p.id]: p.trustScore,
    },
    profileDisplayNames: { ...s.profileDisplayNames, [p.id]: p.name },
    ...(p.avatarUrl?.trim()
      ? {
          profileAvatarUrls: {
            ...s.profileAvatarUrls,
            [p.id]: p.avatarUrl.trim(),
          },
        }
      : {}),
  }))
}

/**
 * Una petición por `userId` en vuelo; el chat reutiliza el mismo `fetch` si pide el mismo perfil a la vez.
 */
export async function fetchPublicProfile(
  userId: string,
): Promise<PublicUserProfile | null> {
  const id = userId.trim()
  if (id.length < 2) return null

  const running = publicProfileInFlight.get(id)
  if (running) return running

  const p = (async (): Promise<PublicUserProfile | null> => {
    try {
      const body = await fetchPublicProfileApi(id)
      markPublicProfileHydrated(id)
      return body
    } finally {
      publicProfileInFlight.delete(id)
    }
  })()

  publicProfileInFlight.set(id, p)
  return p
}
