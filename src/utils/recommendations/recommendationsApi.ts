import { apiFetch } from "../http/apiClient";
import {
  apiErrorTextToUserMessage,
  defaultUnexpectedErrorMessage,
} from "../http/apiErrorMessage";
import type { Offer, StoreBadge } from "../../app/store/marketStoreTypes";
import type { RecommendationBatch } from "../bootstrap/bootstrapTypes";
import { useAppStore } from "../../app/store/useAppStore";
import { getOrCreateGuestId } from "../auth/guestId";

function isPlainRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

/** Asegura camelCase y arrays; el cliente no debe depender de PascalCase del JSON. */
function normalizeRecommendationBatch(raw: unknown): RecommendationBatch {
  const r = isPlainRecord(raw) ? raw : {};
  const idsRaw = r.offerIds ?? r.OfferIds;
  const offerIds = Array.isArray(idsRaw)
    ? idsRaw.map((x) => String(x).trim()).filter(Boolean)
    : [];
  const offersRaw = r.offers ?? r.Offers;
  const offers = isPlainRecord(offersRaw)
    ? (offersRaw as Record<string, Offer>)
    : undefined;
  const storeBadgesRaw = r.storeBadges ?? r.StoreBadges;
  const storeBadges = isPlainRecord(storeBadgesRaw)
    ? (storeBadgesRaw as Record<string, StoreBadge>)
    : undefined;
  const recStoresRaw = r.recommendedStoreIds ?? r.RecommendedStoreIds;
  const recommendedStoreIds = Array.isArray(recStoresRaw)
    ? recStoresRaw.map((x) => String(x).trim()).filter(Boolean)
    : undefined;

  return {
    offerIds,
    offers,
    recommendedStoreIds,
    storeBadges,
    nextCursor: Number(r.nextCursor ?? r.NextCursor ?? 0),
    totalAvailable: Number(r.totalAvailable ?? r.TotalAvailable ?? 0),
    batchSize: Number(r.batchSize ?? r.BatchSize ?? 20),
    threshold: Number(r.threshold ?? r.Threshold ?? 0.35),
    wrapped: Boolean(r.wrapped ?? r.Wrapped),
  };
}

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
