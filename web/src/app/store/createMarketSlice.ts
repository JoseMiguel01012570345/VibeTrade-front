import type { StateCreator } from 'zustand'
import type { MarketState } from './marketStoreTypes'
import { createChatMessagesSlice } from './marketSliceChatMessages'
import { createOffersThreadsSlice } from './marketSliceOffersThreads'
import { createOwnerStoresSlice } from './marketSliceOwnerStores'
import { createRouteOfferPublicSlice } from './marketSliceRouteOfferPublic'
import { createRouteSheetsSlice } from './marketSliceRouteSheets'

export const createMarketSlice: StateCreator<MarketState> = (set, get) => ({
  stores: {},
  offers: {},
  offerIds: [],
  recommendationFeedStartIndex: 0,
  recommendationCursor: 0,
  recommendationTotalAvailable: 0,
  recommendationBatchSize: 50,
  recommendationThreshold: 0.35,
  storeCatalogs: {},
  threads: {},
  routeOfferPublic: {},
  workspacePersistStoreId: null,
  setWorkspacePersistStoreId: (storeId) => set({ workspacePersistStoreId: storeId }),

  ...createOffersThreadsSlice(set, get),
  ...createRouteOfferPublicSlice(set, get),
  ...createRouteSheetsSlice(set, get),
  ...createChatMessagesSlice(set, get),
  ...createOwnerStoresSlice(set, get),
})
