import { create } from 'zustand'
import { createMarketSlice } from './createMarketSlice'
import type { MarketState } from './marketStoreTypes'

export * from './marketStoreTypes'

export const useMarketStore = create<MarketState>()(createMarketSlice)
