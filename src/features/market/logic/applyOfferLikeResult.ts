import type { ToggleLikeResult } from "@features/market/Dtos/offerEngagementApiTypes";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";

/** Sincroniza el resultado de toggle like en `offers` y en el catálogo de tienda (si aplica). */
export function applyOfferLikeResult(
  offerId: string,
  result: ToggleLikeResult,
  opts?: Readonly<{
    storeId?: string;
    catalogKind?: "product" | "service";
  }>,
): void {
  useMarketStore.setState((s) => {
    const existing = s.offers[offerId];
    const offerPatch = {
      offers: {
        ...s.offers,
        [offerId]: existing
          ? {
              ...existing,
              offerLikeCount: result.likeCount,
              viewerLikedOffer: result.liked,
            }
          : {
              id: offerId,
              storeId: opts?.storeId?.trim() ?? "",
              title: "",
              price: "",
              tags: [],
              imageUrl: "",
              offerLikeCount: result.likeCount,
              viewerLikedOffer: result.liked,
            },
      },
    };

    const storeId = opts?.storeId?.trim();
    const kind = opts?.catalogKind;
    const cat = storeId ? s.storeCatalogs[storeId] : undefined;
    if (!storeId || !cat || !kind) return { ...s, ...offerPatch };

    if (kind === "product") {
      return {
        ...s,
        ...offerPatch,
        storeCatalogs: {
          ...s.storeCatalogs,
          [storeId]: {
            ...cat,
            products: cat.products.map((p) =>
              p.id === offerId
                ? {
                    ...p,
                    offerLikeCount: result.likeCount,
                    viewerLikedOffer: result.liked,
                  }
                : p,
            ),
          },
        },
      };
    }

    return {
      ...s,
      ...offerPatch,
      storeCatalogs: {
        ...s.storeCatalogs,
        [storeId]: {
          ...cat,
          services: cat.services.map((svc) =>
            svc.id === offerId
              ? {
                  ...svc,
                  offerLikeCount: result.likeCount,
                  viewerLikedOffer: result.liked,
                }
              : svc,
          ),
        },
      },
    };
  });
}
