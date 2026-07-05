import { apiFetch } from "@shared/services/http/apiClient";
import { throwFromResponse } from "@shared/services/http/throwFromResponse";
import type {
  OfferQaComment,
  OfferQaCommentEnriched,
} from "@features/market/Dtos/offerQaTypes";

export type { ToggleLikeResult } from "@features/market/Dtos/offerEngagementApiTypes";
import type { ToggleLikeResult } from "@features/market/Dtos/offerEngagementApiTypes";

/**
 * Comentarios públicos de una tienda (tablero tipo Q&A a nivel de tienda). Devuelve la lista
 * enriquecida con likes; `null` si la tienda no existe.
 */
export async function fetchStoreComments(
  storeId: string,
): Promise<OfferQaCommentEnriched[] | null> {
  const res = await apiFetch(
    `/api/v1/market/stores/${encodeURIComponent(storeId)}/comments`,
    { method: "GET" },
  );
  if (res.status === 404) return null;
  if (!res.ok) await throwFromResponse(res);
  const raw = (await res.json()) as unknown;
  if (!Array.isArray(raw)) return [];
  return raw as OfferQaCommentEnriched[];
}

/** Publica un comentario (o respuesta si `parentId`) en la tienda; devuelve el ítem creado. */
export async function postStoreComment(
  storeId: string,
  input: { text: string; parentId?: string | null },
): Promise<OfferQaComment> {
  const res = await apiFetch(
    `/api/v1/market/stores/${encodeURIComponent(storeId)}/comments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: input.text,
        parentId: input.parentId ?? null,
        createdAt: Date.now(),
      }),
    },
  );
  if (!res.ok) await throwFromResponse(res);
  return (await res.json()) as OfferQaComment;
}

/** Alterna el «me gusta» de un comentario de tienda para el visitante autenticado. */
export async function toggleStoreCommentLike(
  storeId: string,
  commentId: string,
): Promise<ToggleLikeResult> {
  const res = await apiFetch(
    `/api/v1/market/stores/${encodeURIComponent(storeId)}/comments/${encodeURIComponent(commentId)}/like`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
  );
  if (!res.ok) await throwFromResponse(res);
  return (await res.json()) as ToggleLikeResult;
}
