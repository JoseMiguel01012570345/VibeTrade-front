import type {
  MarketState,
  Offer,
  RecommendationHomeBulk,
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

/** Tamaño de bolsa que pide el cliente al API (después se parte en carrusel de 20). */
export const RECOMMENDATION_API_TAKE = 140;

/** Ofertas por “tarjeta” del carrusel home. */
export const RECOMMENDATION_BULK_OFFER_COUNT = 20;

/** Bolsa API / carrusel: 140 / 20. */
export const RECOMMENDATION_BULKS_PER_BAG = 7;

/**
 * 5.ª tarjeta del lote API actual (offset 4 desde {@link bagStartBulkIdx} cuando hay ≥5 bulks).
 * No usar `rel % RECOMMENDATION_BULKS_PER_BAG`: si el lote tiene 8+ bulks, `rel === 7` deja de coincidir y el feed deja de pedir datos.
 */
export function shouldPrefetchNextBag(
  cardIdx: number,
  bagStartBulkIdx: number,
  bulksInCurrentBag: number,
): boolean {
  if (bulksInCurrentBag < 1) return false;
  const rel = cardIdx - bagStartBulkIdx;
  if (rel < 0 || rel >= bulksInCurrentBag) return false;
  let prefetchRel: number;
  if (bulksInCurrentBag >= 5) {
    prefetchRel = RECOMMENDATION_BULKS_PER_BAG - 3;
  } else if (bulksInCurrentBag >= 2) {
    prefetchRel = 0;
  } else {
    prefetchRel = -1;
  }
  if (prefetchRel < 0) return false;
  return rel === prefetchRel;
}

/** Última tarjeta del lote API actual (sustituye la antigua “7.ª” fija cuando el lote no tiene exactamente 7 bulks). */
export function shouldMergePendingBag(
  cardIdx: number,
  bagStartBulkIdx: number,
  bulksInCurrentBag: number,
): boolean {
  if (bulksInCurrentBag < 1) return false;
  const rel = cardIdx - bagStartBulkIdx;
  return rel === bulksInCurrentBag - 1;
}

const emptyPaging = {
  next: null as string | null,
  prev: null as string | null,
};

function newBulkInstanceKey(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `b-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );
}

/**
 * Misma idea que el ranking de tiendas del servidor: peso (L - i) por posición en el lote;
 * no requiere un array `recommendedStoreIds` en la respuesta.
 */
export function deriveRecommendedStoreIdsFromBatch(
  offerIdsInRankOrder: string[],
  offers: Record<string, { storeId?: string }> | undefined,
  maxStores: number,
): string[] {
  const L = offerIdsInRankOrder.length;
  if (L === 0 || !offers || maxStores <= 0) return [];

  const storeRaw = new Map<string, number>();
  let denom = 0;
  for (let i = 0; i < offerIdsInRankOrder.length; i++) {
    const id = String(offerIdsInRankOrder[i] ?? "").trim();
    if (!id) continue;
    const w = L - i;
    denom += w;
    const o = offers[id];
    const sid = o?.storeId != null ? String(o.storeId).trim() : "";
    if (!sid) continue;
    storeRaw.set(sid, (storeRaw.get(sid) ?? 0) + w);
  }
  if (denom <= 0) return [];

  return [...storeRaw.entries()]
    .sort((a, b) => {
      const na = a[1] / denom;
      const nb = b[1] / denom;
      if (nb !== na) return nb - na;
      return a[0].localeCompare(b[0]);
    })
    .slice(0, maxStores)
    .map(([storeId]) => storeId);
}

export function recommendationBatchToHomeBulk(
  batch: RecommendationBatch,
): RecommendationHomeBulk {
  const offerIds = batch.offerIds
    .map((id) => String(id).trim())
    .filter((id) => id.length > 0);
  const maxStores = Math.max(
    1,
    Math.min(batch.batchSize || RECOMMENDATION_BULK_OFFER_COUNT, 20),
  );
  const storeIds = deriveRecommendedStoreIdsFromBatch(
    offerIds,
    batch.offers,
    maxStores,
  );
  return {
    instanceKey: newBulkInstanceKey(),
    storeIds,
    offerIds,
    ...emptyPaging,
  };
}

/** Un slide del carrusel a partir de un slice de ids (orden = ranking del API). */
export function homeBulkFromOfferSlice(
  sliceIds: string[],
  offers: RecommendationBatch["offers"],
  threshold: number,
): RecommendationHomeBulk {
  const offerIds = sliceIds
    .map((id) => String(id).trim())
    .filter((id) => id.length > 0);
  const cap = Math.min(offerIds.length, RECOMMENDATION_BULK_OFFER_COUNT);
  return recommendationBatchToHomeBulk({
    offerIds,
    offers,
    batchSize: cap > 0 ? cap : RECOMMENDATION_BULK_OFFER_COUNT,
    threshold,
  });
}

/** Reparte `ids` en exactamente `bucketCount` trozos con tamaños lo más iguales posible. */
function splitIdsIntoEvenBuckets(
  ids: string[],
  bucketCount: number,
): string[][] {
  const n = ids.length;
  if (n === 0 || bucketCount < 1) return [];
  const base = Math.floor(n / bucketCount);
  const rem = n % bucketCount;
  const out: string[][] = [];
  let idx = 0;
  for (let i = 0; i < bucketCount; i++) {
    const size = base + (i < rem ? 1 : 0);
    out.push(ids.slice(idx, idx + size));
    idx += size;
  }
  return out;
}

/**
 * Parte una respuesta del API en bulks alineados a la bolsa de 7 tarjetas:
 * - Con ≥7 ofertas: exactamente 7 bulks repartiendo ofertas de forma equitativa (140 → 7×20).
 * - Con menos de 7 ofertas: un bulk por oferta (un slide por oferta).
 */
export function splitRecommendationBatchIntoHomeBulks(
  batch: RecommendationBatch,
): RecommendationHomeBulk[] {
  const ids = batch.offerIds
    .map((id) => String(id).trim())
    .filter((id) => id.length > 0);
  if (ids.length === 0) return [];

  let slices: string[][];
  if (ids.length >= RECOMMENDATION_BULKS_PER_BAG) {
    slices = splitIdsIntoEvenBuckets(ids, RECOMMENDATION_BULKS_PER_BAG);
  } else {
    slices = ids.map((id) => [id]);
  }

  return slices.map((slice) =>
    homeBulkFromOfferSlice(slice, batch.offers, batch.threshold),
  );
}

/** Orden del API a través de los bulks (sin deduplicar). */
function offerIdsFlatFromBulks(bulks: RecommendationHomeBulk[]): string[] {
  const out: string[] = [];
  for (const b of bulks) {
    for (const id of b.offerIds) {
      const t = String(id).trim();
      if (t) out.push(t);
    }
  }
  return out;
}

function collectKeepStoreIdsForBulks(
  bulks: RecommendationHomeBulk[],
  offers: Record<string, { storeId?: string }>,
): Set<string> {
  const s = new Set<string>();
  for (const b of bulks) {
    for (const sid of b.storeIds) {
      const t = String(sid).trim();
      if (t) s.add(t);
    }
    for (const oid of b.offerIds) {
      const o = offers[String(oid).trim()];
      const st = o?.storeId != null ? String(o.storeId).trim() : "";
      if (st) s.add(st);
    }
  }
  return s;
}

/**
 * Sustituye la última bolsa API (desde {@link MarketState.recommendationBagStartBulkIdx})
 * por el nuevo lote; conserva solo los bulks anteriores al inicio de esa bolsa.
 */
export function appendHomeBulksFromApiBag(
  state: MarketState,
  batch: RecommendationBatch,
): { patch: Partial<MarketState>; preferredCardIdx: number } | null {
  if (batch.offerIds.length === 0) return null;

  const newBulks = splitRecommendationBatchIntoHomeBulks(batch);
  if (newBulks.length === 0) return null;

  const prev = state.recommendationHomeBulks ?? [];
  let bagStart = Math.max(0, state.recommendationBagStartBulkIdx ?? 0);
  if (prev.length > 0 && bagStart > prev.length - 1) {
    bagStart = 0;
  }
  const prefix = prev.slice(0, bagStart);
  const combined = [...prefix, ...newBulks];
  const bagStartBulkIdx = prefix.length;
  const preferredCardIdx = Math.min(combined.length - 1, bagStartBulkIdx);

  const flatIds = offerIdsFlatFromBulks(combined);
  const keepOfferIds = new Set(flatIds);

  const offers: Record<string, Offer> = { ...state.offers };
  for (const id of state.recommendationCachedOfferIds ?? []) {
    if (!keepOfferIds.has(id)) delete offers[id];
  }
  Object.assign(offers, batch.offers ?? {});

  const keepStoreIds = collectKeepStoreIdsForBulks(combined, offers);
  const stores: MarketState["stores"] = { ...state.stores };
  for (const id of state.recommendationCachedStoreIds ?? []) {
    if (!keepStoreIds.has(id)) delete stores[id];
  }
  Object.assign(stores, batch.storeBadges ?? {});

  const recStoreIds = [...keepStoreIds];

  return {
    preferredCardIdx,
    patch: {
      recommendationHomeBulks: combined,
      recommendationBagStartBulkIdx: bagStartBulkIdx,
      offerIds: flatIds,
      offers,
      stores,
      /** Una entrada por hueco del feed (incluye el mismo id repetido). */
      recommendationCachedOfferIds: [...flatIds],
      recommendationCachedStoreIds: recStoreIds,
      recommendationFeedStartIndex: 0,
      recommendationStoreStripAnchors: [],
      recommendationFeedExhausted: false,
      recommendationTotalAvailable: flatIds.length,
      recommendationBatchSize: RECOMMENDATION_BULK_OFFER_COUNT,
      recommendationThreshold: batch.threshold,
    },
  };
}
