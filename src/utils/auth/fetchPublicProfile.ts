import { apiFetch } from "../http/apiClient";
import {
  apiErrorTextToUserMessage,
  defaultUnexpectedErrorMessage,
} from "../http/apiErrorMessage";

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
      if (res.status === 404) return null;
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(
          apiErrorTextToUserMessage(t, defaultUnexpectedErrorMessage()),
        );
      }
      return (await res.json()) as PublicUserProfile;
    } finally {
      publicProfileInFlight.delete(id);
    }
  })();

  publicProfileInFlight.set(id, p);
  return p;
}
