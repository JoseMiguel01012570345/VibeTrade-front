import type { RecommendationHomeBulk } from "@app/store/marketStoreTypes";

export function makeRecommendationOfferIds(
  count: number,
  prefix = "o",
): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}-${i + 1}`);
}

export function makeRecommendationBatch(count: number) {
  const offerIds = makeRecommendationOfferIds(count);
  const offers: Record<string, { storeId: string }> = {};
  for (const id of offerIds) {
    offers[id] = { storeId: "store-1" };
  }
  return { offerIds, offers, threshold: 0.35 };
}

export function makeHomeFeedBulk(
  offerIds: string[],
  storeIds: string[] = ["store-1"],
): RecommendationHomeBulk {
  return {
    instanceKey: `bulk-${offerIds.join("-")}`,
    storeIds,
    offerIds,
    next: null,
    prev: null,
  };
}
