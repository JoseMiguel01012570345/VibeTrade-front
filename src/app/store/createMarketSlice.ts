import type { StateCreator } from "zustand";
import type { MarketState } from "./marketStoreTypes";
import { createChatMessagesSlice } from "./marketSliceChatMessages";
import { createOffersThreadsSlice } from "./marketSliceOffersThreads";
import { createOwnerStoresSlice } from "./marketSliceOwnerStores";
import { createRouteOfferPublicSlice } from "./marketSliceRouteOfferPublic";
import { createRouteSheetsSlice } from "./marketSliceRouteSheets";

export const createMarketSlice: StateCreator<MarketState> = (set, get) => ({
  stores: {},
  offers: {},
  offerIds: [],
  recommendationFeedStartIndex: 0,
  recommendationCursor: 0,
  recommendationFeedExhausted: false,
  recommendationTotalAvailable: 0,
  recommendationBatchSize: 20,
  recommendationThreshold: 0.35,
  recommendationStoreStripAnchors: [],
  recommendationHomeBulks: [],
  recommendationBagStartBulkIdx: 0,
  recommendationCachedOfferIds: [],
  recommendationCachedStoreIds: [],
  storeCatalogs: {},
  threads: {},
  routeOfferPublic: {},
  workspacePersistStoreId: null,
  setWorkspacePersistStoreId: (storeId) =>
    set({ workspacePersistStoreId: storeId }),

  applyStoreTrustPenalty: (storeId, penalty) => {
    const sid = (storeId ?? "").trim();
    if (!sid || penalty <= 0) return;
    set((s) => {
      const b = s.stores[sid];
      if (!b) return s;
      const score = Math.max(-10_000, b.trustScore - penalty);
      const nextBadge = { ...b, trustScore: score };
      const nextStores = { ...s.stores, [sid]: nextBadge };
      const nextThreads = { ...s.threads };
      for (const tid of Object.keys(nextThreads)) {
        const th = nextThreads[tid];
        if (th.storeId === sid) {
          nextThreads[tid] = {
            ...th,
            store: { ...th.store, trustScore: score },
          };
        }
      }
      return { ...s, stores: nextStores, threads: nextThreads };
    });
  },

  ...createOffersThreadsSlice(set, get),
  ...createRouteOfferPublicSlice(set, get),
  ...createRouteSheetsSlice(set, get),
  ...createChatMessagesSlice(set, get),
  ...createOwnerStoresSlice(set, get),
});
