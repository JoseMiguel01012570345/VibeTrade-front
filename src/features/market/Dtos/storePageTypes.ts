export type StoreScreen = "catalog" | "vitrina" | "products" | "services";

/** Pantallas con filtros de precio / texto propios (no compartidos entre sí). */
export type StoreFilterSection = "vitrina" | "products" | "services";

export type PriceSort = "none" | "asc" | "desc";

/** Qué listados mostrar en la vitrina (filtro de vista). */
export type VitrinaListMode = "products" | "services" | "both";

/** Visibilidad por estado de publicación (vitrina / pestañas; útil para el dueño). */
export type CatalogPublishedFilter = "all" | "published" | "draft";

/** Filtros de una sección (vitrina, pestaña productos o pestaña servicios). */
export type StoreSectionFilters = {
  productNameQ: string;
  productCategoryQ: string[];
  productConditionQ: string;
  serviceNameQ: string;
  serviceCategoryQ: string[];
  priceSort: PriceSort;
  priceFloor: number | null;
  priceCeiling: number | null;
  /** Monedas aceptadas a filtrar; vacío = todas. Coincide si el ítem acepta al menos una. */
  acceptedMonedaQ: string[];
  /** Solo aplica en vitrina; en otras secciones se ignora. */
  vitrinaListMode: VitrinaListMode;
  /** Productos y servicios: todos, solo publicados en vitrina o solo borradores. */
  catalogPublishedFilter: CatalogPublishedFilter;
};
