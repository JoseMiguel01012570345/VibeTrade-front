import type { MarketState, Offer } from "../../app/store/marketStoreTypes";
import type { RecommendationBatch } from "../../utils/bootstrap/bootstrapTypes";

/** Máximo de ofertas en memoria en el feed de inicio (al pasar de 200, se recorta el exceso). */
export const REC_FEED_CAP = 200;

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
  if (ids.length > REC_FEED_CAP) {
    const dropped = ids.length - REC_FEED_CAP;
    ids = ids.slice(-REC_FEED_CAP);
    feedStart += dropped;
  }
  return {
    offerIds: ids,
    offers: mergedOffers,
    recommendationFeedStartIndex: feedStart,
    recommendationCursor: batch.nextCursor,
    recommendationTotalAvailable: batch.totalAvailable,
    recommendationBatchSize: batch.batchSize,
    recommendationThreshold: batch.threshold,
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
  if (ids.length > REC_FEED_CAP) {
    ids = ids.slice(0, REC_FEED_CAP);
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
  return {
    ...batch,
    offerIds: prefixIds,
    offers,
  };
}
