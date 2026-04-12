import { apiFetch } from "../http/apiClient";
import {
  apiErrorTextToUserMessage,
  defaultUnexpectedErrorMessage,
} from "../http/apiErrorMessage";
import type { RecommendationBatch } from "../bootstrap/bootstrapTypes";

export async function fetchRecommendationBatch(
  cursor: number,
  take = 50,
): Promise<RecommendationBatch> {
  const qs = new URLSearchParams({
    cursor: String(Math.max(0, cursor)),
    take: String(Math.max(1, take)),
  });
  const res = await apiFetch(`/api/v1/recommendations?${qs.toString()}`);
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
  const res = await apiFetch("/api/v1/recommendations/interactions", {
    method: "POST",
    body: JSON.stringify({ offerId, eventType }),
  });
  if (!res.ok && res.status !== 400 && res.status !== 401) {
    const t = await res.text().catch(() => "");
    throw new Error(
      apiErrorTextToUserMessage(t, defaultUnexpectedErrorMessage()),
    );
  }
}
