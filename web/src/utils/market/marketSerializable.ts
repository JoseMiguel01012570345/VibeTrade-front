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

/** Cuerpo del PUT `/market/workspace`: snapshot completo o solo la tienda en edición. */
export function marketWorkspacePutPayload(s: MarketState): MarketSerializableSlice {
  const id = s.workspacePersistStoreId
  if (!id) return marketDataSnapshot(s)
  const store = s.stores[id]
  const catalog = s.storeCatalogs[id]
  if (!store || !catalog) return marketDataSnapshot(s)
  return {
    stores: { [id]: store },
    storeCatalogs: { [id]: catalog },
    offers: {},
    offerIds: [],
    threads: {},
    routeOfferPublic: {},
  }
}
