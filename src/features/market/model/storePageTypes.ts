export type {
  StoreScreen,
  StoreFilterSection,
  PriceSort,
  VitrinaListMode,
  CatalogPublishedFilter,
  StoreSectionFilters,
} from "../Dtos/storePageTypes";
import type { CatalogPublishedFilter, StoreSectionFilters } from "../Dtos/storePageTypes";

export function emptyStoreSectionFilters(): StoreSectionFilters {
  return {
    productNameQ: "",
    productCategoryQ: [],
    productConditionQ: "",
    serviceNameQ: "",
    serviceCategoryQ: [],
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
