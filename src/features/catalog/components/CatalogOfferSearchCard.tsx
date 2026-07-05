import type { CatalogSearchItem } from "@features/catalog/Dtos/catalogSearchTypes";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { StorefrontProductCard } from "@features/storefront/components/StorefrontProductCard";
import { StorefrontServiceCard } from "@features/storefront/components/StorefrontServiceCard";
import { HomeEmergentRouteCard } from "@features/home/components/HomeEmergentRouteCard";
import { emergentOfferForMap } from "@features/catalog/logic/catalogOfferCardDisplay";
import {
  resolveSearchProduct,
  resolveSearchService,
} from "@features/catalog/logic/catalogSearchStoreItem";

type Props = Readonly<{
  item: CatalogSearchItem;
}>;

export function CatalogOfferSearchCard({ item }: Props) {
  const storeCatalogs = useMarketStore((s) => s.storeCatalogs);
  const { store, offer } = item;
  if (!offer) return null;

  if (offer.kind === "emergent") {
    return (
      <HomeEmergentRouteCard
        offer={emergentOfferForMap(offer, store.id)}
        routePreview={undefined}
        mapKey={`search-map-${offer.id}`}
      />
    );
  }

  if (offer.kind === "service") {
    const service = resolveSearchService(offer, store.id, storeCatalogs);
    return <StorefrontServiceCard s={service} />;
  }

  const product = resolveSearchProduct(offer, store.id, storeCatalogs);
  return <StorefrontProductCard p={product} />;
}
