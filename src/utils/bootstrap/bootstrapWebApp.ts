import toast from "react-hot-toast";
import { useAppStore } from "../../app/store/useAppStore";
import { useMarketStore } from "../../app/store/useMarketStore";
import type { ReelComment } from "../../pages/reels/ReelCommentsPanel";
import { apiFetch } from "../http/apiClient";
import { getSessionToken } from "../http/sessionToken";
import { setMarketHydrating } from "../market/marketPersistence";
import { setReelsBootstrap } from "../reels/reelsBootstrapState";
import type { BootstrapResponse } from "./bootstrapTypes";
import {
  RECOMMENDATION_API_TAKE,
  RECOMMENDATION_BULK_OFFER_COUNT,
  splitRecommendationBatchIntoHomeBulks,
} from "../../pages/home/homeFeedMerge";
import { getOrCreateGuestId } from "../auth/guestId";
import { syncChatNotificationsFromServer } from "../notifications/notificationsSync";
import { startChatRealtime } from "../chat/chatRealtime";

function normalizeReelsCovers(items: BootstrapResponse["reels"]["items"]) {
  return items.map((r) => ({
    ...r,
    cover:
      r.cover ??
      "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=1200&q=80",
  }));
}

function normalizeReelsComments(comments: Record<string, ReelComment[]>) {
  const base = Date.now();
  let n = 0;
  const out: Record<string, ReelComment[]> = {};
  for (const [k, list] of Object.entries(comments)) {
    out[k] = list.map((c) => ({
      ...c,
      at:
        typeof c.at === "number" && c.at > 1_000_000_000_000
          ? c.at
          : base - ++n * 60_000,
    }));
  }
  return out;
}

function offerIdsFromRecommendations(
  rec: BootstrapResponse["recommendations"] | undefined,
): string[] {
  if (!rec) return [];
  const raw =
    rec.offerIds ??
    (rec as unknown as { OfferIds?: unknown }).OfferIds;
  const fromArray = Array.isArray(raw)
    ? raw.map((x) => String(x).trim()).filter(Boolean)
    : [];
  if (fromArray.length > 0) return fromArray;
  if (rec?.offers && typeof rec.offers === "object")
    return Object.keys(rec.offers);
  return [];
}

export async function bootstrapWebApp(): Promise<void> {
  const token = getSessionToken();
  const active = useAppStore.getState().isSessionActive;
  const res = await apiFetch(
    token && active
      ? "/api/v1/bootstrap"
      : `/api/v1/bootstrap/guest?${new URLSearchParams({
          guestId: getOrCreateGuestId(),
        }).toString()}`,
  );
  if (!res.ok) {
    const msg = `No se pudo cargar datos (${res.status}). ¿Está el backend en marcha?`;
    toast.error(msg);
    throw new Error(msg);
  }
  const json = (await res.json()) as BootstrapResponse;
  const fromRec = offerIdsFromRecommendations(json.recommendations).slice(
    0,
    RECOMMENDATION_API_TAKE,
  );
  const fromMarket = (json.market.offerIds ?? []).slice(
    0,
    RECOMMENDATION_API_TAKE,
  );
  let bootOfferIds = fromRec.length > 0 ? fromRec : fromMarket;
  if (bootOfferIds.length === 0) {
    bootOfferIds = Object.keys(json.market?.offers ?? {}).slice(
      0,
      RECOMMENDATION_API_TAKE,
    );
  }
  const bootFeedStart = 0;

  const recBatch =
    fromRec.length > 0
      ? {
          offerIds: fromRec,
          offers: json.recommendations?.offers,
          storeBadges: json.recommendations?.storeBadges,
          batchSize: RECOMMENDATION_BULK_OFFER_COUNT,
          threshold: json.recommendations?.threshold ?? 0.35,
        }
      : null;
  const initialBulks =
    recBatch != null ? splitRecommendationBatchIntoHomeBulks(recBatch) : [];
  const firstRecBulk = initialBulks[0] ?? null;

  setMarketHydrating(true);
  const bootStoreBadges = json.recommendations?.storeBadges;
  useMarketStore.setState({
    stores:
      bootStoreBadges && typeof bootStoreBadges === "object"
        ? { ...json.market.stores, ...bootStoreBadges }
        : json.market.stores,
    offers: {
      ...json.market.offers,
      ...(json.recommendations?.offers ?? {}),
    },
    offerIds: bootOfferIds,
    recommendationFeedStartIndex: bootFeedStart,
    recommendationCursor: 0,
    recommendationFeedExhausted: false,
    recommendationTotalAvailable: bootOfferIds.length,
    recommendationBatchSize: RECOMMENDATION_BULK_OFFER_COUNT,
    recommendationThreshold: json.recommendations?.threshold ?? 0.35,
    recommendationStoreStripAnchors:
      firstRecBulk &&
      firstRecBulk.storeIds.length > 0 &&
      bootOfferIds.length > 0
        ? [{ beforeOfferIndex: 0, storeIds: firstRecBulk.storeIds }]
        : [],
    recommendationHomeBulks: initialBulks,
    recommendationBagStartBulkIdx: 0,
    recommendationCachedOfferIds:
      fromRec.length > 0
        ? [...fromRec]
        : Object.keys(json.recommendations?.offers ?? {}),
    recommendationCachedStoreIds: Object.keys(
      json.recommendations?.storeBadges ?? {},
    ),
    storeCatalogs: json.market.storeCatalogs,
    threads: json.market.threads,
    routeOfferPublic: json.market.routeOfferPublic,
    workspacePersistStoreId: null,
  });
  setMarketHydrating(false);

  const savedIds = json.savedOfferIds ?? [];
  useAppStore.setState({
    profileDisplayNames: json.profileDisplayNames ?? {},
    savedOffers: Object.fromEntries(savedIds.map((id) => [id, true])),
  });

  setReelsBootstrap({
    ...json.reels,
    items: normalizeReelsCovers(json.reels.items),
    initialComments: normalizeReelsComments(json.reels.initialComments),
  });

  if (token && active) {
    void syncChatNotificationsFromServer();
    startChatRealtime();
  }
}
