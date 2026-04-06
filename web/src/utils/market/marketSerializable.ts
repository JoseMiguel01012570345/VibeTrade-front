import type { MarketState } from '../../app/store/marketStoreTypes'

/** Parte del store que se persiste en el backend. */
export type MarketSerializableSlice = Pick<
  MarketState,
  'stores' | 'offers' | 'offerIds' | 'storeCatalogs' | 'threads' | 'routeOfferPublic'
>

export function marketDataSnapshot(s: MarketState): MarketSerializableSlice {
  return {
    stores: s.stores,
    offers: s.offers,
    offerIds: s.offerIds,
    storeCatalogs: s.storeCatalogs,
    threads: s.threads,
    routeOfferPublic: s.routeOfferPublic,
  }
}
