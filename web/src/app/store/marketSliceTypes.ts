import type { StateCreator } from 'zustand'
import type { MarketState } from './marketStoreTypes'

export type MarketSliceSet = Parameters<StateCreator<MarketState>>[0]
export type MarketSliceGet = Parameters<StateCreator<MarketState>>[1]
