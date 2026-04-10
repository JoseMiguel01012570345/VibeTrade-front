export type StoreScreen = "catalog" | "vitrina" | "products" | "services";

/** Pantallas con filtros de precio / texto propios (no compartidos entre sí). */
export type StoreFilterSection = "vitrina" | "products" | "services";

export type PriceSort = "none" | "asc" | "desc";

/** Qué listados mostrar en la vitrina (filtro de vista). */
export type VitrinaListMode = "products" | "services" | "both";

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
  /** Código de moneda aceptada (p. ej. USD, CUP); vacío = todas. */
  acceptedMonedaQ: string;
  /** Solo aplica en vitrina; en otras secciones se ignora. */
  vitrinaListMode: VitrinaListMode;
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
    acceptedMonedaQ: "",
    vitrinaListMode: "both",
  };
}

export const PRODUCT_CONDITION_FILTER_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "nuevo", label: "Nuevo" },
  { value: "usado", label: "Usado" },
  { value: "reacondicionado", label: "Reacondicionado" },
] as const;
