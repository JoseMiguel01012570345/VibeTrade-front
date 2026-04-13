import type {
  MarketState,
  Offer,
  RecommendationStoreStripAnchor,
} from "../../app/store/marketStoreTypes";
import type { RecommendationBatch } from "../../utils/bootstrap/bootstrapTypes";

export type HomeFeedSegment =
  | { type: "offers"; offerIds: string[] }
  | { type: "stores"; storeIds: string[] };

/**
 * Bloques ofertas / tiendas: cada ancla inserta la tira **antes** de la oferta en `beforeOfferIndex`
 * (índice en `offerIds`; 0 = al inicio del feed).
 */
export function buildHomeFeedSegments(
  offerIds: string[],
  anchors: RecommendationStoreStripAnchor[] | undefined,
): HomeFeedSegment[] {
  const sorted = [...(anchors ?? [])].sort(
    (a, b) => a.beforeOfferIndex - b.beforeOfferIndex,
  );
  const L = offerIds.length;
  const out: HomeFeedSegment[] = [];
  let cursor = 0;
  for (const a of sorted) {
    const pos = Math.min(Math.max(0, a.beforeOfferIndex), L);
    if (pos > cursor) {
      out.push({ type: "offers", offerIds: offerIds.slice(cursor, pos) });
    }
    if ((a.storeIds?.length ?? 0) > 0) {
      out.push({ type: "stores", storeIds: a.storeIds });
    }
    cursor = pos;
  }
  if (cursor < L) {
    out.push({ type: "offers", offerIds: offerIds.slice(cursor) });
  }
  return out;
}

/** Máximo de ofertas en memoria en el feed de inicio (al pasar de 200, se recorta el exceso). */
export const REC_FEED_CAP = 200;

function dedupeStoreStripAnchors(
  anchors: RecommendationStoreStripAnchor[],
): RecommendationStoreStripAnchor[] {
  const byIndex = new Map<number, string[]>();
  for (const a of anchors) {
    const n = a.beforeOfferIndex;
    if (n < 0 || (a.storeIds?.length ?? 0) === 0) continue;
    const prev = byIndex.get(n);
    if (!prev) {
      byIndex.set(n, [...a.storeIds]);
      continue;
    }
    const seen = new Set(prev);
    for (const id of a.storeIds) {
      if (!seen.has(id)) {
        seen.add(id);
        prev.push(id);
      }
    }
  }
  return [...byIndex.entries()]
    .sort(([x], [y]) => x - y)
    .map(([beforeOfferIndex, storeIds]) => ({ beforeOfferIndex, storeIds }));
}

function sliceOffersForIds(
  ids: string[],
  offers: Record<string, Offer> | undefined,
): Record<string, Offer> {
  if (!offers) return {};
  const out: Record<string, Offer> = {};
  for (const id of ids) {
    const o = offers[id];
    if (o) out[id] = o;
  }
  return out;
}

/** Añade un lote inferior; si hay más de {@link REC_FEED_CAP}, se descartan las más viejas (arriba). */
export function applyBottomRecommendationBatch(
  state: MarketState,
  batch: RecommendationBatch,
): Partial<MarketState> | null {
  if (batch.offerIds.length === 0) return null;
  const mergedIds = [...state.offerIds, ...batch.offerIds];
  const mergedOffers = { ...state.offers, ...(batch.offers ?? {}) };
  let feedStart = state.recommendationFeedStartIndex ?? 0;
  let ids = mergedIds;
  const oldOfferLen = state.offerIds.length;
  let nextAnchors: RecommendationStoreStripAnchor[] = [
    ...(state.recommendationStoreStripAnchors ?? []),
  ];
  const appendedStores = batch.recommendedStoreIds ?? [];
  if (appendedStores.length > 0) {
    /** Tira antes del primer ítem del lote recién añadido. */
    nextAnchors.push({
      beforeOfferIndex: oldOfferLen,
      storeIds: appendedStores,
    });
  }
  nextAnchors = dedupeStoreStripAnchors(nextAnchors);

  if (ids.length > REC_FEED_CAP) {
    const dropped = ids.length - REC_FEED_CAP;
    ids = ids.slice(-REC_FEED_CAP);
    feedStart += dropped;
    nextAnchors = nextAnchors
      .map((a) => ({ ...a, beforeOfferIndex: a.beforeOfferIndex - dropped }))
      .filter(
        (a) => a.beforeOfferIndex >= 0 && a.beforeOfferIndex <= ids.length,
      );
  }
  return {
    offerIds: ids,
    offers: mergedOffers,
    recommendationFeedStartIndex: feedStart,
    recommendationCursor: batch.nextCursor,
    recommendationTotalAvailable: batch.totalAvailable,
    recommendationBatchSize: batch.batchSize,
    recommendationThreshold: batch.threshold,
    recommendationStoreStripAnchors: nextAnchors,
  };
}

/**
 * Anteponer un lote (scroll arriba). `requestCursor` es el `cursor` enviado al API.
 * `batch` ya debe contener solo los ids anteriores a la ventana actual (sin solaparse).
 */
export function applyTopRecommendationBatch(
  state: MarketState,
  batch: RecommendationBatch,
  requestCursor: number,
): Partial<MarketState> | null {
  if (batch.offerIds.length === 0) return null;
  let ids = [...batch.offerIds, ...state.offerIds];
  const mergedOffers = { ...(batch.offers ?? {}), ...state.offers };
  const feedStart = requestCursor;

  const prependedLen = batch.offerIds.length;
  let nextAnchors: RecommendationStoreStripAnchor[] = (
    state.recommendationStoreStripAnchors ?? []
  ).map((a) => ({
    ...a,
    beforeOfferIndex: a.beforeOfferIndex + prependedLen,
  }));
  const prependStores = batch.recommendedStoreIds ?? [];
  if (prependStores.length > 0) {
    nextAnchors.push({ beforeOfferIndex: 0, storeIds: prependStores });
  }
  nextAnchors = dedupeStoreStripAnchors(nextAnchors);
  nextAnchors.sort((a, b) => a.beforeOfferIndex - b.beforeOfferIndex);

  if (ids.length > REC_FEED_CAP) {
    ids = ids.slice(0, REC_FEED_CAP);
    nextAnchors = nextAnchors.filter((a) => a.beforeOfferIndex <= ids.length);
  }
  const L = ids.length;
  return {
    offerIds: ids,
    offers: mergedOffers,
    recommendationFeedStartIndex: feedStart,
    recommendationCursor: feedStart + L,
    recommendationTotalAvailable: batch.totalAvailable,
    recommendationBatchSize: batch.batchSize,
    recommendationThreshold: batch.threshold,
    recommendationStoreStripAnchors: nextAnchors,
  };
}

/** Recorta un batch “hacia atrás” para no duplicar ítems cuando `cursor` queda en 0. */
export function trimBatchForPrepend(
  batch: RecommendationBatch,
  feedStart: number,
  requestCursor: number,
): RecommendationBatch {
  const need = Math.max(0, feedStart - requestCursor);
  const prefixIds = batch.offerIds.slice(0, Math.min(batch.offerIds.length, need));
  const offers = sliceOffersForIds(prefixIds, batch.offers);
  const keepStores = prefixIds.length === batch.offerIds.length;
  return {
    ...batch,
    offerIds: prefixIds,
    offers,
    recommendedStoreIds: keepStores ? batch.recommendedStoreIds : [],
  };
}
