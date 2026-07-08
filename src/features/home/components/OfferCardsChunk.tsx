import type { RouteOfferPublicState } from "@features/market/logic/store/marketStoreTypes";
import type { Offer } from "@features/market/logic/store/useMarketStore";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { useNavigate } from "react-router-dom";
import { storeHref } from "@features/market/logic/store/storePath";
import { StorefrontProductCard } from "@features/storefront/components/StorefrontProductCard";
import { StorefrontServiceCard } from "@features/storefront/components/StorefrontServiceCard";
import {
  isEmergentRouteOffer,
  isServiceOffer,
  resolveHomeOfferPrimaryImageUrl,
  resolveHomeProductFromOffer,
  resolveHomeServiceFromOffer,
} from "../logic/homeOfferCatalogItem";
import { HomeEmergentRouteCard } from "./HomeEmergentRouteCard";

export function OfferCardsChunk({
  items,
  routeOfferPublic,
}: Readonly<{
  items: Offer[];
  routeOfferPublic: Partial<Record<string, RouteOfferPublicState>>;
}>) {
  const storeCatalogs = useMarketStore((s) => s.storeCatalogs);
  const stores = useMarketStore((s) => s.stores);
  const nav = useNavigate();

  function navigateToStore(storeId: string, offerId: string, kind: "product" | "service") {
    const store = stores[storeId];
    nav(storeHref(store), {
      state: { selectedOfferId: offerId, selectedOfferKind: kind },
    });
  }

  return (
    <section>
      <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
        {items.map((offer, i) => {
          if (isEmergentRouteOffer(offer)) {
            const routePreview =
              routeOfferPublic[offer.id] ??
              (offer.emergentBaseOfferId
                ? routeOfferPublic[offer.emergentBaseOfferId]
                : undefined);
            return (
              <HomeEmergentRouteCard
                key={`${offer.id}-${i}`}
                offer={offer}
                routePreview={routePreview}
                mapKey={`map-${offer.id}-${i}`}
                offerAmbient={false}
              />
            );
          }

          if (isServiceOffer(offer)) {
            const service = resolveHomeServiceFromOffer(offer, storeCatalogs);
            return (
              <StorefrontServiceCard
                key={`${offer.id}-${i}`}
                s={service}
                offerAmbient={false}
                offerAmbientImageUrl={resolveHomeOfferPrimaryImageUrl(
                  offer,
                  storeCatalogs,
                )}
                onSelect={(s) => navigateToStore(s.storeId, s.id, "service")}
              />
            );
          }

          const product = resolveHomeProductFromOffer(offer, storeCatalogs);
          return (
            <StorefrontProductCard
              key={`${offer.id}-${i}`}
              p={product}
              offerAmbient={false}
              onSelect={(p) => navigateToStore(p.storeId, p.id, "product")}
              offerAmbientImageUrl={resolveHomeOfferPrimaryImageUrl(
                offer,
                storeCatalogs,
              )}
            />
          );
        })}
      </div>
    </section>
  );
}
