import type { CatalogSearchItem } from "@/utils/market/searchStores";
import { makeStoreBadge } from "@test/Resources/Market/store-factories";

export function makeCatalogSearchStoreItem(
  id: string,
  name: string,
): CatalogSearchItem {
  return {
    kind: "store",
    store: makeStoreBadge({ id, name }),
    publishedProducts: 2,
    publishedServices: 1,
  };
}

export function makeCatalogSearchProductItem(
  offerId: string,
  title: string,
  storeId = "store-search-1",
): CatalogSearchItem {
  const store = makeStoreBadge({ id: storeId });
  return {
    kind: "product",
    store,
    offer: {
      id: offerId,
      kind: "product",
      name: title,
      acceptedCurrencies: ["USD"],
    },
  };
}
