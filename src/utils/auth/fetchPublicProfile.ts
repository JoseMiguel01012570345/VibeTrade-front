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

export async function fetchPublicProfile(
  userId: string,
): Promise<PublicUserProfile | null> {
  const id = userId.trim();
  if (id.length < 2) return null;
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
  return res.json() as Promise<PublicUserProfile>;
}
