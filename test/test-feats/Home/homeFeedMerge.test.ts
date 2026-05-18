import { describe, expect, it } from "vitest";
import { useMarketStore } from "@app/store/useMarketStore";
import {
  RECOMMENDATION_BULKS_PER_BAG,
  RECOMMENDATION_BULK_OFFER_COUNT,
  appendHomeBulksFromApiBag,
  shouldFetchRecommendationBag,
  shouldMergePendingBag,
  shouldPrefetchNextBag,
  splitIdsIntoHomeCarouselChunks,
  splitRecommendationBatchIntoHomeBulks,
} from "@features/home/homeFeedMerge";
import {
  makeRecommendationBatch,
  makeRecommendationOfferIds,
} from "@test/Resources/Home/feed-factories";
import { makeOffer } from "@test/Resources/Market/offer-factories";

describe("splitIdsIntoHomeCarouselChunks", () => {
  it("splits 140 ids into 7 slices of 20", () => {
    const slices = splitIdsIntoHomeCarouselChunks(makeRecommendationOfferIds(140));
    expect(slices).toHaveLength(7);
    expect(slices.every((s) => s.length === 20)).toBe(true);
  });

  it("splits 30 ids into [20, 10] not 7 equal buckets", () => {
    const slices = splitIdsIntoHomeCarouselChunks(makeRecommendationOfferIds(30));
    expect(slices).toHaveLength(2);
    expect(slices[0]).toHaveLength(20);
    expect(slices[1]).toHaveLength(10);
  });

  it("keeps 5 ids in a single slice", () => {
    const slices = splitIdsIntoHomeCarouselChunks(makeRecommendationOfferIds(5));
    expect(slices).toHaveLength(1);
    expect(slices[0]).toHaveLength(5);
  });

  it("caps at 7 slices when more than 140 ids (drops remainder)", () => {
    const slices = splitIdsIntoHomeCarouselChunks(makeRecommendationOfferIds(145));
    expect(slices).toHaveLength(RECOMMENDATION_BULKS_PER_BAG);
    expect(slices.every((s) => s.length === 20)).toBe(true);
    expect(slices.flat()).toHaveLength(140);
  });
});

describe("splitRecommendationBatchIntoHomeBulks", () => {
  it("returns empty for no offer ids", () => {
    expect(splitRecommendationBatchIntoHomeBulks(makeRecommendationBatch(0))).toEqual([]);
  });

  it("maps batch into bulks with correct offer counts", () => {
    const bulks = splitRecommendationBatchIntoHomeBulks(makeRecommendationBatch(30));
    expect(bulks).toHaveLength(2);
    expect(bulks[0].offerIds).toHaveLength(20);
    expect(bulks[1].offerIds).toHaveLength(10);
  });
});

describe("shouldPrefetchNextBag", () => {
  const bagStart = 0;

  it("prefetches on first card when bag has 2 bulks", () => {
    expect(shouldPrefetchNextBag(0, bagStart, 2)).toBe(true);
    expect(shouldPrefetchNextBag(1, bagStart, 2)).toBe(false);
  });

  it("prefetches on 5th card (rel 4) when bag has 7 bulks", () => {
    expect(shouldPrefetchNextBag(4, bagStart, 7)).toBe(true);
    expect(shouldPrefetchNextBag(3, bagStart, 7)).toBe(false);
  });

  it("prefetches on 5th card when bag has 5 bulks", () => {
    expect(shouldPrefetchNextBag(4, bagStart, 5)).toBe(true);
    expect(shouldPrefetchNextBag(0, bagStart, 5)).toBe(false);
  });

  it("does not prefetch for single-bulk bag", () => {
    expect(shouldPrefetchNextBag(0, bagStart, 1)).toBe(false);
  });
});

describe("shouldFetchRecommendationBag", () => {
  const bagStart = 0;

  it("does not fetch when the bag has only one block", () => {
    expect(shouldFetchRecommendationBag(0, bagStart, 1)).toBe(false);
  });

  it("fetches on first slide when bag has 2 blocks", () => {
    expect(shouldFetchRecommendationBag(0, bagStart, 2)).toBe(true);
  });

  it("fetches on last slide when bag has 2 blocks", () => {
    expect(shouldFetchRecommendationBag(1, bagStart, 2)).toBe(true);
  });
});

describe("shouldMergePendingBag", () => {
  const bagStart = 2;

  it("merges on last card of current bag", () => {
    expect(shouldMergePendingBag(3, bagStart, 2)).toBe(true);
    expect(shouldMergePendingBag(2, bagStart, 2)).toBe(false);
  });

  it("merges on 7th card when bag has 7 bulks", () => {
    expect(shouldMergePendingBag(6, 0, 7)).toBe(true);
    expect(shouldMergePendingBag(5, 0, 7)).toBe(false);
  });
});

describe("appendHomeBulksFromApiBag", () => {
  it("replaces the current API bag with new carousel bulks", () => {
    const offer = makeOffer({ id: "o-1", storeId: "store-1" });
    const state = useMarketStore.getState();
    useMarketStore.setState({
      ...state,
      recommendationHomeBulks: [
        {
          instanceKey: "b1",
          storeIds: ["store-1"],
          offerIds: ["o-1"],
          next: null,
          prev: null,
        },
      ],
      recommendationBagStartBulkIdx: 0,
      offers: { "o-1": offer },
      stores: { "store-1": { id: "store-1", name: "S", ownerUserId: "u" } },
    });
    const nextIds = makeRecommendationOfferIds(25, "n");
    const nextOffers: Record<string, ReturnType<typeof makeOffer>> = {};
    for (const id of nextIds) {
      nextOffers[id] = makeOffer({ id, storeId: "store-1" });
    }
    const result = appendHomeBulksFromApiBag(useMarketStore.getState(), {
      offerIds: nextIds,
      offers: nextOffers,
      threshold: 0.35,
    });
    expect(result?.patch.recommendationHomeBulks).toHaveLength(2);
    expect(result?.patch.recommendationHomeBulks?.[0].offerIds).toHaveLength(
      20,
    );
  });
});

