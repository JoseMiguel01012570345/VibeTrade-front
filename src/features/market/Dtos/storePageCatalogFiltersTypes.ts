import type { CatalogPublishedFilter, PriceSort } from "./storePageTypes";

/** Minimal shape so callers can pass `StoreSectionFilters` without a circular import. */
type StoreSectionFiltersLike = {
  productNameQ: string;
  productCategoryQ: string[];
  productConditionQ: string;
  serviceNameQ: string;
  serviceCategoryQ: string[];
  acceptedMonedaQ: readonly string[];
  catalogPublishedFilter: CatalogPublishedFilter;
};

export type ProductSectionFilterFields = Pick<
  StoreSectionFiltersLike,
  | "productNameQ"
  | "productCategoryQ"
  | "productConditionQ"
  | "acceptedMonedaQ"
  | "catalogPublishedFilter"
>;

export type ServiceSectionFilterFields = Pick<
  StoreSectionFiltersLike,
  | "serviceNameQ"
  | "serviceCategoryQ"
  | "acceptedMonedaQ"
  | "catalogPublishedFilter"
>;

export type PriceRangeSortOpts = {
  sliderMax: number;
  priceFloor: number | null;
  priceCeiling: number | null;
  priceSort: PriceSort;
};
