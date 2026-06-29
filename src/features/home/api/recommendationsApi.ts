import { apiFetch } from "@shared/services/http/apiClient";
import {
  apiErrorTextToUserMessage,
  defaultUnexpectedErrorMessage,
} from "@shared/services/http/apiErrorMessage";
import type { RecommendationBatch } from "@app/bootstrap/bootstrapTypes";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { getOrCreateGuestId } from "@features/auth/logic/guestId";
import { normalizeRecommendationBatch } from "../logic/recommendationBatchMapper";

/** Una página de recomendaciones: solo `take` (y sesión / guestId en la URL de invitado). */
export async function fetchRecommendationPage(
  take = 20,
): Promise<RecommendationBatch> {
  const rawTake = String(Math.max(1, take));
  const qs = new URLSearchParams({ take: rawTake });
  const isSessionActive = useAppStore.getState().isSessionActive;
  const path = isSessionActive
    ? `/api/v1/recommendations?${qs.toString()}`
    : `/api/v1/recommendations/guest?${new URLSearchParams({
        guestId: getOrCreateGuestId(),
        take: rawTake,
      }).toString()}`;

  const res = await apiFetch(path);
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(
      apiErrorTextToUserMessage(t, defaultUnexpectedErrorMessage()),
    );
  }
  return normalizeRecommendationBatch(await res.json());
}

export async function trackRecommendationInteraction(
  offerId: string,
  eventType: "click" | "chat_start" | "inquiry",
): Promise<void> {
  if (!offerId.trim()) return;
  const isSessionActive = useAppStore.getState().isSessionActive;
  const res = await apiFetch(
    isSessionActive
      ? "/api/v1/recommendations/interactions"
      : "/api/v1/recommendations/guest/interactions",
    {
      method: "POST",
      body: JSON.stringify(
        isSessionActive
          ? { offerId, eventType }
          : { guestId: getOrCreateGuestId(), offerId, eventType },
      ),
    },
  );
  if (!res.ok && res.status !== 400 && res.status !== 401) {
    const t = await res.text().catch(() => "");
    throw new Error(
      apiErrorTextToUserMessage(t, defaultUnexpectedErrorMessage()),
    );
  }
}
