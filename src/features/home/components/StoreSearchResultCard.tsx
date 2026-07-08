import { StoreOrganicCard } from "./StoreOrganicCard";
import type { StoreBadge } from "@features/market/logic/store/marketStoreTypes";

type Props = Readonly<{
  store: StoreBadge;
  publishedProducts: number;
  publishedServices: number;
  distanceKm?: number | null;
}>;

export function StoreSearchResultCard({
  store,
  publishedProducts,
  publishedServices,
  distanceKm,
}: Props) {
  return (
    <StoreOrganicCard
      store={store}
      variant="search"
      overlayLink
      publishedProducts={publishedProducts}
      publishedServices={publishedServices}
      distanceKm={distanceKm}
    />
  );
}
