import type { EmergentRouteParadaSnapshot } from "@features/market/Dtos/marketTypes";
import type { StoreBadge } from "@features/market/Dtos/marketTypes";

export type CatalogSearchKind = "store" | "product" | "service" | "emergent";

export type CatalogOfferPreview = {
  id: string;
  kind: "product" | "service" | "emergent";
  name?: string;
  category?: string;
  price?: string;
  currency?: string | null;
  acceptedCurrencies: string[];
  photoUrls?: string[];
  nombreServicio?: string;
  shortDescription?: string;
  descripcion?: string;
  /** Solo emergentes: tramos para el mismo mapa que en el feed. */
  emergentRouteParadas?: EmergentRouteParadaSnapshot[];
};

export type CatalogSearchItem = {
  kind: CatalogSearchKind;
  store: StoreBadge;
  offer?: CatalogOfferPreview | null;
  publishedProducts?: number | null;
  publishedServices?: number | null;
  distanceKm?: number | null;
};

export type CatalogSearchPageResult = {
  items: CatalogSearchItem[];
  hasMore: boolean;
  offset: number;
  limit: number;
};

export type StoreSearchParams = {
  name?: string;
  category?: string;
  kinds?: CatalogSearchKind[];
  trustMin?: number;
  lat?: number;
  lng?: number;
  km?: number;
  limit?: number;
  offset?: number;
};

export type CatalogSearchParams = {
  storeNameQ: string;
  storeCategories: string[];
  kinds: CatalogSearchKind[];
  km: string;
  trustMin: string;
  geo: { lat: number; lng: number } | null;
  offset: number;
  limit: number;
};

export type CatalogCategoriesJson = {
  categories: string[];
};

export type CurrenciesJson = {
  currencies: string[];
};
