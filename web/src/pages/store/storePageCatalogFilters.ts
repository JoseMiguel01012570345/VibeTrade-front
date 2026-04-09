import type {
  StoreProduct,
  StoreService,
} from "../chat/domain/storeCatalogTypes";
import {
  matchesCategoryFilter,
  matchesConditionFilter,
  matchesNameQuery,
} from "../../utils/market/nameCategoryFilter";
import {
  compareParsedPricesWithTieBreak,
  parseProductPriceNumber,
  serviceComparablePrice,
} from "../../utils/market/parseProductPrice";
import type { PriceSort } from "./storePageTypes";

/** Minimal shape so callers can pass `StoreSectionFilters` without a circular import. */
type StoreSectionFiltersLike = {
  productNameQ: string;
  productCategoryQ: string;
  productConditionQ: string;
  serviceNameQ: string;
  serviceCategoryQ: string;
};

export type ProductSectionFilterFields = Pick<
  StoreSectionFiltersLike,
  "productNameQ" | "productCategoryQ" | "productConditionQ"
>;

export type ServiceSectionFilterFields = Pick<
  StoreSectionFiltersLike,
  "serviceNameQ" | "serviceCategoryQ"
>;

export type PriceRangeSortOpts = {
  sliderMax: number;
  priceFloor: number | null;
  priceCeiling: number | null;
  priceSort: PriceSort;
};

export function filterProductsBySectionText(
  products: StoreProduct[],
  f: ProductSectionFilterFields,
): StoreProduct[] {
  return products.filter(
    (p) =>
      (matchesNameQuery(p.name, f.productNameQ) ||
        matchesNameQuery(p.model ?? "", f.productNameQ)) &&
      matchesCategoryFilter(p.category, f.productCategoryQ) &&
      matchesConditionFilter(p.condition, f.productConditionQ),
  );
}

export function filterServicesBySectionText(
  services: StoreService[],
  f: ServiceSectionFilterFields,
): StoreService[] {
  return services.filter(
    (s) =>
      (matchesNameQuery(s.tipoServicio, f.serviceNameQ) ||
        matchesNameQuery(s.descripcion, f.serviceNameQ)) &&
      matchesCategoryFilter(s.category, f.serviceCategoryQ),
  );
}

export function applyProductPriceRangeAndSort(
  list: StoreProduct[],
  opts: PriceRangeSortOpts,
): StoreProduct[] {
  let result = list;
  const floor = opts.priceFloor ?? 0;
  const cap = opts.priceCeiling ?? opts.sliderMax;
  if (opts.sliderMax > 0) {
    result = result.filter((p) => {
      const n = parseProductPriceNumber(p.price);
      if (n == null) return true;
      return n >= floor && n <= cap;
    });
  }
  if (opts.priceSort === "asc" || opts.priceSort === "desc") {
    const order = opts.priceSort;
    result = [...result].sort((a, b) =>
      compareParsedPricesWithTieBreak(
        parseProductPriceNumber(a.price),
        parseProductPriceNumber(b.price),
        order,
        () =>
          order === "asc"
            ? a.name.localeCompare(b.name, "es")
            : b.name.localeCompare(a.name, "es"),
      ),
    );
  }
  return result;
}

export function applyServicePriceRangeAndSort(
  list: StoreService[],
  opts: PriceRangeSortOpts,
): StoreService[] {
  let result = list;
  const floor = opts.priceFloor ?? 0;
  const cap = opts.priceCeiling ?? opts.sliderMax;
  if (opts.sliderMax > 0) {
    result = result.filter((s) => {
      const n = serviceComparablePrice(s);
      if (n == null) return true;
      return n >= floor && n <= cap;
    });
  }
  if (opts.priceSort === "asc" || opts.priceSort === "desc") {
    const order = opts.priceSort;
    result = [...result].sort((a, b) =>
      compareParsedPricesWithTieBreak(
        serviceComparablePrice(a),
        serviceComparablePrice(b),
        order,
        () =>
          order === "asc"
            ? a.tipoServicio.localeCompare(b.tipoServicio, "es")
            : b.tipoServicio.localeCompare(a.tipoServicio, "es"),
      ),
    );
  }
  return result;
}
