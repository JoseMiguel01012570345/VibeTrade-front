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

function offerIdsFromOffersRecord(
  offers: Record<string, Offer> | undefined,
): string[] {
  if (!offers || typeof offers !== "object") return [];
  return Object.keys(offers);
}

/** Asegura camelCase; el cliente no debe depender de PascalCase del JSON. */
function normalizeRecommendationBatch(raw: unknown): RecommendationBatch {
  const r = isPlainRecord(raw) ? raw : {};
  const offersRaw = r.offers ?? r.Offers;
  const offers = isPlainRecord(offersRaw)
    ? (offersRaw as Record<string, Offer>)
    : undefined;

  const idsRaw = r.offerIds ?? r.OfferIds;
  const fromArray = Array.isArray(idsRaw)
    ? idsRaw.map((x) => String(x).trim()).filter(Boolean)
    : [];
  /** Orden y repeticiones: priorizar el array del API; no sustituir por Object.keys(offers) (colapsa duplicados). */
  const offerIds =
    fromArray.length > 0
      ? fromArray
      : offerIdsFromOffersRecord(offers);

  const storeBadgesRaw = r.storeBadges ?? r.StoreBadges;
  const storeBadges = isPlainRecord(storeBadgesRaw)
    ? (storeBadgesRaw as Record<string, StoreBadge>)
    : undefined;

  return {
    offerIds,
    offers,
    storeBadges,
    batchSize: Number(r.batchSize ?? r.BatchSize ?? 20),
    threshold: Number(r.threshold ?? r.Threshold ?? 0.35),
  };
}

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
