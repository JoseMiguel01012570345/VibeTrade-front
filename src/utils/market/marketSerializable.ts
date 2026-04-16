import type { MarketState, StoreBadge } from "../../app/store/marketStoreTypes";

/** Forma del mercado en bootstrap / GET workspace (snapshot completo). */
export type MarketSerializableSlice = Pick<
  MarketState,
  | "stores"
  | "offers"
  | "offerIds"
  | "storeCatalogs"
  | "threads"
  | "routeOfferPublic"
>;

export function marketDataSnapshot(s: MarketState): MarketSerializableSlice {
  return {
    stores: s.stores,
    offers: s.offers,
    offerIds: s.offerIds,
    storeCatalogs: s.storeCatalogs,
    threads: s.threads,
    routeOfferPublic: s.routeOfferPublic,
  };
}

/** Solo tiendas del usuario (no todo el mercado en memoria). */
function filterOwnedStores(
  s: MarketState,
  ownerUserId: string | null,
): Record<string, StoreBadge> {
  const stores: Record<string, StoreBadge> = {};
  if (!ownerUserId) return stores;
  for (const [id, st] of Object.entries(s.stores)) {
    if (st.ownerUserId === ownerUserId) {
      stores[id] = st;
    }
  }
  return stores;
}

/**
 * Tiendas cuyo perfil debe persistirse (PUT workspace/stores).
 * El cliente envía cada una como JSON plano (campos de la tienda + `id`), sin `{ stores: {...} }`.
 */
export function storeProfileBodiesToPersist(
  s: MarketState,
  ownerUserId: string | null,
): StoreBadge[] {
  const persistId = s.workspacePersistStoreId;
  if (persistId) {
    const store = s.stores[persistId];
    if (!store) return [];
    if (ownerUserId && store.ownerUserId !== ownerUserId) return [];
    return [store];
  }
  if (!ownerUserId) return [];
  return Object.values(filterOwnedStores(s, ownerUserId));
}
