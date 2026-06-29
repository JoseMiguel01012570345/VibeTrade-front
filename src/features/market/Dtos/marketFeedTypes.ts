import type { StoreProduct, StoreService } from "./storeCatalogTypes";

export type StoreProductInput = Omit<StoreProduct, "id" | "storeId">;
export type StoreServiceInput = Omit<StoreService, "id" | "storeId">;

/**
 * Tira de tiendas al **inicio** de un lote: se muestra justo antes de la oferta en índice `beforeOfferIndex`
 * (0 = antes del primer ítem del feed).
 */
export type RecommendationStoreStripAnchor = {
  beforeOfferIndex: number;
  storeIds: string[];
};

/** Un “bulk” del feed home: tiendas sugeridas del lote + ids de ofertas de ese lote (alineado al API de recomendaciones). */
export type RecommendationHomeBulk = {
  /** Clave estable para React cuando dos lotes comparten los mismos offerIds. */
  instanceKey?: string;
  storeIds: string[];
  offerIds: string[];
  /** Página siguiente (memoria + API en el borde inferior de la ventana). */
  next: string | null;
  /** Página anterior (API solo desde el bulk índice 0). */
  prev: string | null;
};
