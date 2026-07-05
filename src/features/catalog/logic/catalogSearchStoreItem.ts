import type { CatalogOfferPreview } from "@features/catalog/Dtos/catalogSearchTypes";
import type {
  StoreCatalog,
  StoreProduct,
  StoreService,
} from "@features/market/logic/storeCatalogTypes";
import { normalizeStoreService } from "@features/market/logic/storeCatalogTypes";
import { TOOL_PLACEHOLDER_SRC } from "@features/market/logic/toolPlaceholder";

function photoUrlsFromPreview(offer: CatalogOfferPreview): string[] {
  return (offer.photoUrls ?? []).map((u) => String(u).trim()).filter(Boolean);
}

export function catalogPreviewToProduct(
  offer: CatalogOfferPreview,
  storeId: string,
): StoreProduct {
  const photos = photoUrlsFromPreview(offer);
  return {
    id: offer.id,
    storeId,
    category: offer.category?.trim() || "Producto",
    name: offer.name?.trim() || offer.category || "Producto",
    shortDescription: offer.shortDescription?.trim() ?? "",
    mainBenefit: "",
    technicalSpecs: "",
    condition: "nuevo",
    price: offer.price?.trim() || "—",
    monedaPrecio: offer.currency?.trim() || undefined,
    monedas: offer.acceptedCurrencies?.length
      ? offer.acceptedCurrencies
      : undefined,
    availability: "Disponible",
    warrantyReturn: "",
    contentIncluded: "",
    usageConditions: "",
    photoUrls: photos,
    published: true,
    customFields: [],
  };
}

export function catalogPreviewToService(
  offer: CatalogOfferPreview,
  storeId: string,
): StoreService {
  const photos = photoUrlsFromPreview(offer);
  return {
    id: offer.id,
    storeId,
    published: true,
    category: offer.category?.trim() || "Servicio",
    nombreServicio:
      offer.nombreServicio?.trim() ||
      offer.name?.trim() ||
      offer.category ||
      "Servicio",
    descripcion: offer.descripcion?.trim() ?? "",
    riesgos: { enabled: false, items: [] },
    incluye: "",
    noIncluye: "",
    dependencias: { enabled: false, items: [] },
    entregables: "",
    garantias: { enabled: false, texto: "" },
    propIntelectual: "",
    photoUrls: photos.length > 0 ? photos : [TOOL_PLACEHOLDER_SRC],
    customFields: [],
  };
}

export function resolveSearchProduct(
  offer: CatalogOfferPreview,
  storeId: string,
  storeCatalogs: Record<string, StoreCatalog>,
): StoreProduct {
  const fromCatalog = storeCatalogs[storeId]?.products.find(
    (p) => p.id === offer.id,
  );
  return fromCatalog ?? catalogPreviewToProduct(offer, storeId);
}

export function resolveSearchService(
  offer: CatalogOfferPreview,
  storeId: string,
  storeCatalogs: Record<string, StoreCatalog>,
): StoreService {
  const fromCatalog = storeCatalogs[storeId]?.services.find(
    (s) => s.id === offer.id,
  );
  return fromCatalog
    ? normalizeStoreService(fromCatalog)
    : catalogPreviewToService(offer, storeId);
}
