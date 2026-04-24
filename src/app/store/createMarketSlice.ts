import type { StateCreator } from "zustand";
import { getSessionToken } from "../../utils/http/sessionToken";
import {
  postStoreTrustAdjust,
  trustHistoryItemFromApi,
} from "../../utils/trust/trustLedgerApi";
import type { MarketState } from "./marketStoreTypes";
import { useAppStore } from "./useAppStore";
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

  applyStoreTrustPenalty: (
    storeId,
    penalty,
    reason = "Ajuste a la tienda (demo)",
    opts?: { forceLocal?: boolean },
  ) => {
    const sid = (storeId ?? "").trim();
    if (!sid || penalty <= 0) return;

    const applyLocal = () => {
      let balanceAfter = 0;
      set((s) => {
        const b = s.stores[sid];
        const prevFromThread = Object.values(s.threads).find(
          (th) => th.storeId === sid,
        )?.store.trustScore;
        const prev = b?.trustScore ?? prevFromThread ?? 0;
        const score = Math.max(-10_000, prev - penalty);
        balanceAfter = score;
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
        if (!b) {
          return { ...s, threads: nextThreads };
        }
        const nextBadge = { ...b, trustScore: score };
        const nextStores = { ...s.stores, [sid]: nextBadge };
        return { ...s, stores: nextStores, threads: nextThreads };
      });
      useAppStore.getState().appendStoreTrustLedger(sid, -penalty, balanceAfter, reason);
    };

    if (!opts?.forceLocal && getSessionToken()) {
      void postStoreTrustAdjust(sid, -penalty, reason)
        .then((r) => {
          const score = r.trustScore;
          set((s) => {
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
            const b = s.stores[sid];
            if (!b) return { ...s, threads: nextThreads };
            const nextBadge = { ...b, trustScore: score };
            const nextStores = { ...s.stores, [sid]: nextBadge };
            return { ...s, stores: nextStores, threads: nextThreads };
          });
          useAppStore
            .getState()
            .prependStoreTrustHistory(sid, trustHistoryItemFromApi(r.entry));
        })
        .catch(() => {
          applyLocal();
        });
      return;
    }
    applyLocal();
  },

  ...createOffersThreadsSlice(set, get),
  ...createRouteOfferPublicSlice(set, get),
  ...createRouteSheetsSlice(set, get),
  ...createChatMessagesSlice(set, get),
  ...createOwnerStoresSlice(set, get),
});
