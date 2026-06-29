import type { Offer, StoreBadge } from "@features/market/logic/store/marketStoreTypes";
import type { RecommendationBatch } from "@app/bootstrap/bootstrapTypes";

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
export function normalizeRecommendationBatch(raw: unknown): RecommendationBatch {
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
