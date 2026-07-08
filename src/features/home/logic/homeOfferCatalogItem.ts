import type { Offer } from "@features/market/logic/store/marketStoreTypes";
import type {
  StoreCatalog,
  StoreProduct,
  StoreService,
} from "@features/market/logic/storeCatalogTypes";
import { normalizeStoreService } from "@features/market/logic/storeCatalogTypes";
import { TOOL_PLACEHOLDER_SRC } from "@features/market/logic/toolPlaceholder";

export function isEmergentRouteOffer(offer: Offer): boolean {
  return offer.isEmergentRoutePublication === true;
}

export function isServiceOffer(offer: Offer): boolean {
  return offer.tags.includes("Servicio");
}

function catalogProductForOffer(
  offerId: string,
  storeId: string,
  storeCatalogs: Record<string, StoreCatalog>,
): StoreProduct | undefined {
  const cat = storeCatalogs[storeId];
  return cat?.products.find((p) => p.id === offerId);
}

function catalogServiceForOffer(
  offerId: string,
  storeId: string,
  storeCatalogs: Record<string, StoreCatalog>,
): StoreService | undefined {
  const cat = storeCatalogs[storeId];
  return cat?.services.find((s) => s.id === offerId);
}

function photoUrlsFromOffer(offer: Offer): string[] {
  const fromGallery = (offer.imageUrls ?? [])
    .map((u) => String(u).trim())
    .filter(Boolean);
  if (fromGallery.length > 0) return fromGallery;
  const single = offer.imageUrl?.trim();
  if (single) return [single];
  return [];
}

function productFallbackFromOffer(offer: Offer): StoreProduct {
  const category =
    offer.tags.find((t) => t !== "Servicio")?.trim() || "Producto";
  return {
    id: offer.id,
    storeId: offer.storeId,
    category,
    name: offer.title.trim() || category,
    shortDescription: offer.description?.trim() ?? "",
    mainBenefit: "",
    technicalSpecs: "",
    condition: "nuevo",
    price: offer.price,
    availability: "Disponible",
    warrantyReturn: "",
    contentIncluded: "",
    usageConditions: "",
    photoUrls: photoUrlsFromOffer(offer),
    published: true,
    offerLikeCount: offer.offerLikeCount,
    viewerLikedOffer: offer.viewerLikedOffer,
    publicCommentCount: offer.publicCommentCount,
    customFields: [],
  };
}

function serviceFallbackFromOffer(offer: Offer): StoreService {
  const category =
    offer.tags.find((t) => t !== "Servicio")?.trim() || "Servicio";
  const photos = photoUrlsFromOffer(offer);
  return {
    id: offer.id,
    storeId: offer.storeId,
    published: true,
    category,
    nombreServicio: offer.title.trim() || category,
    descripcion: offer.description?.trim() ?? "",
    riesgos: { enabled: false, items: [] },
    incluye: "",
    noIncluye: "",
    dependencias: { enabled: false, items: [] },
    entregables: "",
    garantias: { enabled: false, texto: "" },
    propIntelectual: "",
    photoUrls: photos.length > 0 ? photos : [TOOL_PLACEHOLDER_SRC],
    offerLikeCount: offer.offerLikeCount,
    viewerLikedOffer: offer.viewerLikedOffer,
    publicCommentCount: offer.publicCommentCount,
    customFields: [],
  };
}

function enrichProduct(offer: Offer, product: StoreProduct): StoreProduct {
  return {
    ...product,
    offerLikeCount: offer.offerLikeCount ?? product.offerLikeCount,
    viewerLikedOffer: offer.viewerLikedOffer ?? product.viewerLikedOffer,
    publicCommentCount: offer.publicCommentCount ?? product.publicCommentCount,
  };
}

function enrichService(offer: Offer, service: StoreService): StoreService {
  return {
    ...service,
    offerLikeCount: offer.offerLikeCount ?? service.offerLikeCount,
    viewerLikedOffer: offer.viewerLikedOffer ?? service.viewerLikedOffer,
    publicCommentCount: offer.publicCommentCount ?? service.publicCommentCount,
  };
}

export function resolveHomeProductFromOffer(
  offer: Offer,
  storeCatalogs: Record<string, StoreCatalog>,
): StoreProduct {
  const fromCatalog = catalogProductForOffer(
    offer.id,
    offer.storeId,
    storeCatalogs,
  );
  if (fromCatalog) return enrichProduct(offer, fromCatalog);
  return productFallbackFromOffer(offer);
}

export function resolveHomeServiceFromOffer(
  offer: Offer,
  storeCatalogs: Record<string, StoreCatalog>,
): StoreService {
  const fromCatalog = catalogServiceForOffer(
    offer.id,
    offer.storeId,
    storeCatalogs,
  );
  if (fromCatalog) return enrichService(offer, normalizeStoreService(fromCatalog));
  return serviceFallbackFromOffer(offer);
}

/** Primera imagen útil de una oferta del feed home (para ambiente / color dominante). */
export function resolveHomeOfferPrimaryImageUrl(
  offer: Offer,
  storeCatalogs: Record<string, StoreCatalog>,
): string | null {
  if (isEmergentRouteOffer(offer)) return null;

  if (isServiceOffer(offer)) {
    const service = resolveHomeServiceFromOffer(offer, storeCatalogs);
    const url = (service.photoUrls ?? []).find(
      (u) => u.trim() && u !== TOOL_PLACEHOLDER_SRC,
    );
    return url?.trim() ?? null;
  }

  const product = resolveHomeProductFromOffer(offer, storeCatalogs);
  const url = (product.photoUrls ?? []).find((u) => u.trim());
  return url?.trim() ?? null;
}
