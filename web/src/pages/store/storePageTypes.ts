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
  productCategoryQ: string;
  productConditionQ: string;
  serviceNameQ: string;
  serviceCategoryQ: string;
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

export function emptyStoreSectionFilters(): StoreSectionFilters {
  return {
    productNameQ: "",
    productCategoryQ: "",
    productConditionQ: "",
    serviceNameQ: "",
    serviceCategoryQ: "",
    priceSort: "none",
    priceFloor: null,
    priceCeiling: null,
    acceptedMonedaQ: [],
    vitrinaListMode: "both",
    catalogPublishedFilter: "all",
  };
}

export const CATALOG_PUBLISHED_FILTER_OPTIONS: ReadonlyArray<{
  value: CatalogPublishedFilter;
  label: string;
}> = [
  { value: "all", label: "Todos (publicados y borradores)" },
  { value: "published", label: "Solo publicados" },
  { value: "draft", label: "Solo no publicados (borrador)" },
];

export const PRODUCT_CONDITION_FILTER_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "nuevo", label: "Nuevo" },
  { value: "usado", label: "Usado" },
  { value: "reacondicionado", label: "Reacondicionado" },
] as const;
