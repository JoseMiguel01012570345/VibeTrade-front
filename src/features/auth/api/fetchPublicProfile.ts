import { useAppStore } from "@features/auth/store/useAppStore";
import { apiFetch } from "@shared/services/http/apiClient";
import {
  apiErrorTextToUserMessage,
  defaultUnexpectedErrorMessage,
} from "@shared/services/http/apiErrorMessage";

/** Perfil mínimo expuesto para visitantes (vitrina / enlaces). */
export type PublicUserProfile = {
  id: string;
  name: string;
  avatarUrl?: string;
  trustScore: number;
};

const publicProfileInFlight = new Map<
  string,
  Promise<PublicUserProfile | null>
>();

/** Respuesta HTTP recibida (200/404): evita reintentos en bucle si falta avatar en caché. */
const publicProfileHydratedIds = new Set<string>();

export function wasPublicProfileHydrated(userId: string): boolean {
  return publicProfileHydratedIds.has(userId.trim());
}

function markPublicProfileHydrated(userId: string): void {
  const id = userId.trim();
  if (id.length >= 2) publicProfileHydratedIds.add(id);
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
  }));
}

/**
 * Una petición por `userId` en vuelo; el chat reutiliza el mismo `fetch` si pide el mismo perfil a la vez.
 */
export async function fetchPublicProfile(
  userId: string,
): Promise<PublicUserProfile | null> {
  const id = userId.trim();
  if (id.length < 2) return null;

  const running = publicProfileInFlight.get(id);
  if (running) return running;

  const p = (async (): Promise<PublicUserProfile | null> => {
    try {
      const res = await apiFetch(
        `/api/v1/auth/public-profile/${encodeURIComponent(id)}`,
      );
      if (res.status === 404) {
        markPublicProfileHydrated(id);
        return null;
      }
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(
          apiErrorTextToUserMessage(t, defaultUnexpectedErrorMessage()),
        );
      }
      const body = (await res.json()) as PublicUserProfile;
      markPublicProfileHydrated(id);
      return body;
    } finally {
      publicProfileInFlight.delete(id);
    }
  })();

  publicProfileInFlight.set(id, p);
  return p;
}
