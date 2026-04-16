import { apiFetch } from "../http/apiClient";
import {
  apiErrorTextToUserMessage,
  defaultUnexpectedErrorMessage,
} from "../http/apiErrorMessage";
import type { RecommendationBatch } from "../bootstrap/bootstrapTypes";
import { useAppStore } from "../../app/store/useAppStore";
import { getOrCreateGuestId } from "../auth/guestId";

export async function fetchRecommendationBatch(
  cursor: number,
  take = 20,
): Promise<RecommendationBatch> {
  const qs = new URLSearchParams({
    cursor: String(Math.max(0, cursor)),
    take: String(Math.max(1, take)),
  });
  const isSessionActive = useAppStore.getState().isSessionActive;
  const path = isSessionActive
    ? `/api/v1/recommendations?${qs.toString()}`
    : `/api/v1/recommendations/guest?${new URLSearchParams({
        guestId: getOrCreateGuestId(),
        ...Object.fromEntries(qs.entries()),
      }).toString()}`;

  const res = await apiFetch(path);
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(
      apiErrorTextToUserMessage(t, defaultUnexpectedErrorMessage()),
    );
  }
  return (await res.json()) as RecommendationBatch;
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
